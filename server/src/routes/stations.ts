import { Router } from "express";
import { db } from "../database/db";
import { getStationStatus } from "../services/streamChecker";
import { attachStreams, STATION_SELECT, type StationRow } from "./localStations";

export const stationsRouter = Router();

/** GET /api/stations — list with optional filters + sort. */
stationsRouter.get("/", (req, res) => {
  const { city, language, genre, sort } = req.query as Record<string, string | undefined>;

  const clauses: string[] = [];
  const params: any[] = [];

  if (city) {
    clauses.push("lower(c.name) = lower(?)");
    params.push(city);
  }
  if (language) {
    clauses.push("lower(s.language) = lower(?)");
    params.push(language);
  }
  if (genre) {
    clauses.push("lower(s.genre) = lower(?)");
    params.push(genre);
  }

  let orderBy = "s.frequency ASC";
  if (sort === "name") orderBy = "s.name ASC";
  if (sort === "recent") orderBy = "s.created_at DESC";

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db.prepare(`${STATION_SELECT} ${where} ORDER BY ${orderBy}`).all(...params) as unknown as StationRow[];

  res.json(attachStreams(rows));
});

/** GET /api/stations/search?q= — tolerant name/city/frequency search. */
stationsRouter.get("/search", (req, res) => {
  const raw = String(req.query.q || "").trim().toLowerCase();
  if (!raw) return res.json([]);

  // Pull out a frequency-looking token (e.g. "98.3", "98.3fm", "98") and
  // whatever text remains, so "98.3 pune" or "mirchi 98" both work.
  const freqMatch = raw.match(/(\d{2,3}(?:\.\d)?)/);
  const freqToken = freqMatch ? freqMatch[1] : null;
  const textToken = raw.replace(/fm/g, "").replace(freqToken ?? "", "").trim();

  const clauses: string[] = [];
  const params: any[] = [];

  if (freqToken) {
    clauses.push("CAST(s.frequency AS TEXT) LIKE ?");
    params.push(`${freqToken}%`);
  }
  if (textToken) {
    clauses.push("(lower(s.name) LIKE ? OR lower(c.name) LIKE ? OR lower(s.genre) LIKE ? OR lower(s.language) LIKE ?)");
    params.push(`%${textToken}%`, `%${textToken}%`, `%${textToken}%`, `%${textToken}%`);
  }

  // If we only got a bare word with no digits, just match text everywhere.
  const where = clauses.length ? clauses.join(freqToken && textToken ? " AND " : " OR ") : "1=0";

  const rows = db
    .prepare(`${STATION_SELECT} WHERE ${where} ORDER BY s.frequency ASC LIMIT 50`)
    .all(...params) as unknown as StationRow[];

  res.json(attachStreams(rows));
});

/** GET /api/stations/frequency/:frequency — exact/near frequency lookup. */
stationsRouter.get("/frequency/:frequency", (req, res) => {
  const freq = Number(req.params.frequency);
  if (Number.isNaN(freq)) {
    return res.status(400).json({ error: true, message: "Invalid frequency" });
  }

  const { city } = req.query as Record<string, string | undefined>;
  const clauses = ["ABS(s.frequency - ?) < 0.05"];
  const params: any[] = [freq];

  if (city) {
    clauses.push("lower(c.name) = lower(?)");
    params.push(city);
  }

  const rows = db
    .prepare(`${STATION_SELECT} WHERE ${clauses.join(" AND ")} ORDER BY s.frequency ASC`)
    .all(...params) as unknown as StationRow[];

  res.json(attachStreams(rows));
});

/** GET /api/stations/:id — single station with all backup streams. */
stationsRouter.get("/:id", (req, res) => {
  const row = db.prepare(`${STATION_SELECT} WHERE s.id = ?`).get(req.params.id) as StationRow | undefined;
  if (!row) {
    return res.status(404).json({ error: true, message: "Station not found" });
  }
  res.json(attachStreams([row])[0]);
});

/** GET /api/stations/:id/status — cached stream probe (status, content-type, final URL). */
stationsRouter.get("/:id/status", async (req, res) => {
  const exists = db.prepare(`SELECT id FROM stations WHERE id = ?`).get(req.params.id);
  if (!exists) {
    return res.status(404).json({ error: true, message: "Station not found" });
  }

  try {
    const result = await getStationStatus(req.params.id);
    res.json(result);
  } catch (err) {
    console.error("Stream status check failed:", err);
    res.status(500).json({ error: true, message: "Could not check stream status" });
  }
});

/**
 * POST /api/stations/test — on-demand, un-cached stream diagnostic.
 *
 * SECURITY: this intentionally only accepts a `stationId` that must
 * already exist in our database — it is NOT a generic URL proxy
 * (`/api/proxy?url=...`), which would let anyone use this server to probe
 * arbitrary third-party hosts. Only station URLs we already store can be
 * tested this way.
 */
stationsRouter.post("/test", async (req, res) => {
  const { stationId } = req.body ?? {};
  if (!stationId || typeof stationId !== "string") {
    return res.status(400).json({ error: true, message: "stationId is required" });
  }

  const exists = db.prepare(`SELECT id FROM stations WHERE id = ?`).get(stationId);
  if (!exists) {
    return res.status(404).json({ error: true, message: "Station not found" });
  }

  try {
    // Bypass the cache for an explicit, user-triggered test.
    db.prepare(`UPDATE streams SET last_checked = NULL WHERE station_id = ?`).run(stationId);
    const result = await getStationStatus(stationId);
    res.json({
      success: result.online,
      status: result.status,
      contentType: result.contentType ?? null,
      finalUrl: result.finalUrl ?? null,
      supportsBrowserPlayback: result.status === "online",
      checkedAt: result.checkedAt,
    });
  } catch (err) {
    console.error("Stream test failed:", err);
    res.status(500).json({ error: true, message: "Could not test stream" });
  }
});
