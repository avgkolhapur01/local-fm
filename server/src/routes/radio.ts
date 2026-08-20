import { Router } from "express";
import rateLimit from "express-rate-limit";
import { radioProvider, type RadioProviderStation } from "../services/radioProvider";
import { probeStreamUrl } from "../services/streamChecker";
import { cached, cacheSet, cacheGet } from "../services/cache";

export const radioRouter = Router();

const LIST_TTL_MS = 10 * 60 * 1000; // 10 min — avoid hammering the directory API
const STATION_REGISTRY_TTL_MS = 20 * 60 * 1000; // how long a station id stays testable

// Extra-strict limiter for the two endpoints explicitly called out in the
// brief as abuse-prone: free-text search and the on-demand stream test.
const strictLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: "Too many requests — please slow down." },
});

/** Curated category chips shown on the Live Radio home. Values map to
 * real Radio Browser country/tag queries — nothing here is invented. */
const CATEGORIES = [
  { id: "india", label: "🇮🇳 India", type: "country", value: "India" },
  { id: "world", label: "🌍 World", type: "tag", value: "world music" },
  { id: "bollywood", label: "🎵 Bollywood", type: "tag", value: "bollywood" },
  { id: "pop", label: "🎵 Pop", type: "tag", value: "pop" },
  { id: "rock", label: "🎸 Rock", type: "tag", value: "rock" },
  { id: "electronic", label: "🎧 Electronic", type: "tag", value: "electronic" },
  { id: "news", label: "📰 News", type: "tag", value: "news" },
  { id: "talk", label: "🎙 Talk", type: "tag", value: "talk" },
  { id: "classical", label: "🎼 Classical", type: "tag", value: "classical" },
  { id: "devotional", label: "🙏 Devotional", type: "tag", value: "devotional" },
] as const;

function toApiShape(s: RadioProviderStation) {
  return {
    id: s.id,
    name: s.name,
    country: s.country,
    countryCode: s.countryCode ?? null,
    language: s.language ?? null,
    genre: s.genre ?? null,
    logo: s.logo,
    website: s.website,
    streamUrl: s.streamUrl,
    streamType: s.streamType,
    bitrateKbps: s.bitrateKbps ?? null,
    // "online" here reflects the directory's own recent health check —
    // NOT that this server just connected to it. The player only shows
    // the LIVE indicator once the browser's <audio> element actually
    // starts playing.
    streamStatus: s.verifiedOnline ? "online" : "unverified",
    clickCount: s.clickCount ?? 0,
  };
}

/** Registers stations we just served so /api/radio/test can validate
 * them later without becoming an open URL proxy — only station IDs we
 * ourselves recently returned from the directory are testable. */
function registerStations(stations: RadioProviderStation[]) {
  for (const s of stations) {
    cacheSet(`radiostation:${s.id}`, s, STATION_REGISTRY_TTL_MS);
  }
}

function onlyVerified(stations: RadioProviderStation[]) {
  return stations.filter((s) => s.verifiedOnline);
}

/** GET /api/radio/live — "NOW LIVE": popular, recently-verified stations only. */
radioRouter.get("/live", async (req, res) => {
  try {
    const stations = await cached("radio:live", LIST_TTL_MS, () => radioProvider.getTopStations(40));
    const verified = onlyVerified(stations);
    registerStations(verified);
    res.json(verified.map(toApiShape));
  } catch (err) {
    console.error("Live Radio fetch failed:", err);
    res.status(502).json({ error: true, message: "The radio directory is temporarily unavailable." });
  }
});

/** GET /api/radio/categories — curated chips backed by real queries. */
radioRouter.get("/categories", (req, res) => {
  res.json(CATEGORIES.map(({ id, label, type, value }) => ({ id, label, type, value })));
});

/** GET /api/radio/search?q= */
radioRouter.get("/search", strictLimiter, async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json([]);

  try {
    const stations = await cached(`radio:search:${q.toLowerCase()}`, LIST_TTL_MS, () =>
      radioProvider.searchStations(q, 40)
    );
    const verified = onlyVerified(stations);
    registerStations(verified);
    res.json(verified.map(toApiShape));
  } catch (err) {
    console.error("Live Radio search failed:", err);
    res.status(502).json({ error: true, message: "The radio directory is temporarily unavailable." });
  }
});

/** GET /api/radio/country/:country */
radioRouter.get("/country/:country", async (req, res) => {
  try {
    const stations = await cached(`radio:country:${req.params.country.toLowerCase()}`, LIST_TTL_MS, () =>
      radioProvider.getStationsByCountry(req.params.country, 40)
    );
    const verified = onlyVerified(stations);
    registerStations(verified);
    res.json(verified.map(toApiShape));
  } catch (err) {
    console.error("Live Radio country fetch failed:", err);
    res.status(502).json({ error: true, message: "The radio directory is temporarily unavailable." });
  }
});

/** GET /api/radio/genre/:genre — actually queries by Radio Browser tag. */
radioRouter.get("/genre/:genre", async (req, res) => {
  try {
    const stations = await cached(`radio:tag:${req.params.genre.toLowerCase()}`, LIST_TTL_MS, () =>
      radioProvider.getStationsByTag(req.params.genre, 40)
    );
    const verified = onlyVerified(stations);
    registerStations(verified);
    res.json(verified.map(toApiShape));
  } catch (err) {
    console.error("Live Radio genre fetch failed:", err);
    res.status(502).json({ error: true, message: "The radio directory is temporarily unavailable." });
  }
});

/**
 * POST /api/radio/test — on-demand diagnostic for a Live Radio station.
 *
 * SECURITY: only accepts a `stationId` we ourselves recently returned
 * from the directory (see registerStations above) — this is NOT an
 * open `/api/proxy?url=...`. An unknown/expired id is rejected.
 */
radioRouter.post("/test", strictLimiter, async (req, res) => {
  const { stationId } = req.body ?? {};
  if (!stationId || typeof stationId !== "string") {
    return res.status(400).json({ error: true, message: "stationId is required" });
  }

  const station = cacheGet<RadioProviderStation>(`radiostation:${stationId}`);
  if (!station) {
    return res.status(404).json({
      error: true,
      message: "Unknown or expired station id — reload the Live Radio list and try again.",
    });
  }

  try {
    const result = await probeStreamUrl(station.streamUrl);
    res.json({
      success: result.online,
      status: result.status,
      contentType: result.contentType,
      streamType: station.streamType,
      browserPlayable: result.status === "online",
    });
  } catch (err) {
    console.error("Live Radio stream test failed:", err);
    res.status(500).json({ error: true, message: "Could not test stream" });
  }
});
