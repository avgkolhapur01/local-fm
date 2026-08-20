/**
 * Radio directory abstraction — Live Radio is powered by this interface
 * rather than hand-entered URLs, so the actual provider can be swapped
 * later without touching any route or player code.
 *
 * The concrete implementation below talks to Radio Browser
 * (https://www.radio-browser.info), a free, public, community-maintained
 * directory of real Internet radio streams. No API key is required, and
 * it publishes its own continuous health-check result for every station
 * (`lastcheckok`), which is exactly the kind of "recently verified"
 * signal this app's Live Radio section requires — we don't have to
 * separately probe thousands of external stations ourselves.
 */

export type ProviderStreamType = "mp3" | "aac" | "ogg" | "hls" | "unknown";

export interface RadioProviderStation {
  id: string;
  name: string;
  country: string;
  countryCode?: string;
  language?: string;
  genre?: string;
  logo?: string | null;
  website?: string | null;
  streamUrl: string;
  streamType: ProviderStreamType;
  bitrateKbps?: number;
  /** True only if the provider's own recent health check succeeded. */
  verifiedOnline: boolean;
  clickCount?: number;
}

export interface RadioProvider {
  searchStations(query: string, limit?: number): Promise<RadioProviderStation[]>;
  getStationsByCountry(country: string, limit?: number): Promise<RadioProviderStation[]>;
  getStationsByTag(tag: string, limit?: number): Promise<RadioProviderStation[]>;
  getTopStations(limit?: number): Promise<RadioProviderStation[]>;
  getStation(id: string): Promise<RadioProviderStation | null>;
}

// Radio Browser publishes several regional mirrors behind a load-balanced
// alias; we try a couple of known-good hosts in order and fail over.
// Per Radio Browser's own guidance, we identify ourselves with a
// descriptive User-Agent rather than pretending to be a browser.
const API_HOSTS = ["https://de1.api.radio-browser.info", "https://at1.api.radio-browser.info"];
const USER_AGENT = "LocalFM/1.0 (+https://github.com/local-fm; contact: dev@local-fm.example)";
const REQUEST_TIMEOUT_MS = 8000;

interface RawStation {
  stationuuid: string;
  name: string;
  url_resolved?: string;
  url?: string;
  favicon?: string;
  homepage?: string;
  country?: string;
  countrycode?: string;
  language?: string;
  tags?: string;
  codec?: string;
  bitrate?: number;
  lastcheckok?: number;
  clickcount?: number;
}

function mapStreamType(codec: string | undefined, url: string): ProviderStreamType {
  const lower = (codec ?? "").toLowerCase();
  if (url.includes(".m3u8") || lower === "hls") return "hls";
  if (lower.includes("mp3") || lower === "mpeg") return "mp3";
  if (lower.includes("aac")) return "aac";
  if (lower.includes("ogg") || lower.includes("vorbis") || lower.includes("opus")) return "ogg";
  return "unknown";
}

function mapStation(raw: RawStation): RadioProviderStation | null {
  const streamUrl = raw.url_resolved || raw.url;
  if (!streamUrl || !raw.name) return null;

  return {
    id: raw.stationuuid,
    name: raw.name.trim(),
    country: raw.country || "Unknown",
    countryCode: raw.countrycode || undefined,
    language: raw.language ? capitalize(raw.language.split(",")[0].trim()) : undefined,
    genre: raw.tags ? capitalize(raw.tags.split(",")[0].trim()) : undefined,
    logo: raw.favicon || null,
    website: raw.homepage || null,
    streamUrl,
    streamType: mapStreamType(raw.codec, streamUrl),
    bitrateKbps: raw.bitrate || undefined,
    verifiedOnline: raw.lastcheckok === 1,
    clickCount: raw.clickcount ?? undefined,
  };
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

async function providerFetch(path: string, params: Record<string, string | number | boolean> = {}): Promise<RawStation[]> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    qs.set(key, String(value));
  }
  // Only ever return recently-verified, non-broken stations from the
  // directory itself — we do not proactively probe every result.
  if (!qs.has("hidebroken")) qs.set("hidebroken", "true");

  let lastError: unknown;
  for (const host of API_HOSTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${host}${path}?${qs.toString()}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Radio directory responded ${res.status}`);
      return (await res.json()) as RawStation[];
    } catch (err) {
      lastError = err;
      continue; // try the next mirror
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Radio directory unavailable");
}

export class RadioBrowserProvider implements RadioProvider {
  async searchStations(query: string, limit = 40): Promise<RadioProviderStation[]> {
    const raw = await providerFetch("/json/stations/search", {
      name: query,
      limit,
      order: "clickcount",
      reverse: true,
    });
    return raw.map(mapStation).filter((s): s is RadioProviderStation => s !== null);
  }

  async getStationsByCountry(country: string, limit = 40): Promise<RadioProviderStation[]> {
    const raw = await providerFetch("/json/stations/search", {
      country,
      limit,
      order: "clickcount",
      reverse: true,
    });
    return raw.map(mapStation).filter((s): s is RadioProviderStation => s !== null);
  }

  async getStationsByTag(tag: string, limit = 40): Promise<RadioProviderStation[]> {
    const raw = await providerFetch("/json/stations/search", {
      tag,
      limit,
      order: "clickcount",
      reverse: true,
    });
    return raw.map(mapStation).filter((s): s is RadioProviderStation => s !== null);
  }

  async getTopStations(limit = 40): Promise<RadioProviderStation[]> {
    const raw = await providerFetch("/json/stations/search", {
      limit,
      order: "clickcount",
      reverse: true,
    });
    return raw.map(mapStation).filter((s): s is RadioProviderStation => s !== null);
  }

  async getStation(id: string): Promise<RadioProviderStation | null> {
    // Radio Browser's documented single-station lookup path.
    const raw = await providerFetch(`/json/stations/byuuid/${encodeURIComponent(id)}`, {});
    const first = raw[0];
    return first ? mapStation(first) : null;
  }
}

export const radioProvider: RadioProvider = new RadioBrowserProvider();
