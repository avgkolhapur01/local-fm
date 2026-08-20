// Uses Node's built-in global fetch (available in Node 18+) rather than the
// node-fetch package, since node-fetch v3 is ESM-only and doesn't play well
// with this project's CommonJS server build.
import { db } from "../database/db";

const CACHE_MS = Number(process.env.STREAM_CHECK_CACHE_MS || 10 * 60 * 1000);
const CONNECT_TIMEOUT_MS = 5000;
const VALIDATION_TIMEOUT_MS = 10000;

// Content-Types that indicate a genuinely playable audio/HLS stream.
// Extensions are NOT used to make this decision — some valid Icecast/
// Shoutcast streams have no file extension at all (e.g. .../8000/).
const PLAYABLE_CONTENT_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/aac",
  "audio/aacp",
  "audio/x-aac",
  "audio/ogg",
  "audio/webm",
  "application/ogg",
  "audio/x-mpegurl", // legacy m3u
  "application/vnd.apple.mpegurl", // HLS manifest
  "application/x-mpegurl",
  "audio/x-scpls", // .pls playlist
];

export type StreamStatus = "online" | "offline" | "unverified" | "unsupported";

interface StreamRow {
  id: string;
  stream_url: string;
  stream_type: string;
  last_checked: string | null;
  status: string | null;
}

export interface StreamProbeResult {
  online: boolean;
  status: StreamStatus;
  httpStatus: number | null;
  contentType: string | null;
  finalUrl: string;
  redirected: boolean;
}

/**
 * Tests a stream URL without ever downloading the full (effectively
 * infinite) broadcast. Radio streams never end, so we:
 *   1. Try a HEAD request first (cheapest — headers only, no body).
 *   2. Some Icecast/Shoutcast servers reject HEAD, so fall back to a
 *      ranged GET and abort the connection the instant headers arrive
 *      (before any real audio bytes are consumed).
 *   3. Respect a short connection timeout and a slightly longer overall
 *      validation timeout so one dead station never blocks the queue.
 *   4. Follow redirects (fetch does this by default) and report the
 *      final resolved URL — useful for stations that redirect their
 *      "friendly" URL to the actual streaming server.
 */
async function probeUrl(url: string): Promise<StreamProbeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);

  const finish = (res: Response, online: boolean): StreamProbeResult => {
    const contentType = res.headers.get("content-type");
    const normalizedType = contentType?.split(";")[0].trim().toLowerCase() ?? null;
    const looksPlayable = normalizedType ? PLAYABLE_CONTENT_TYPES.includes(normalizedType) : online;

    return {
      online,
      status: !online ? "offline" : looksPlayable ? "online" : "unsupported",
      httpStatus: res.status,
      contentType: normalizedType,
      finalUrl: res.url || url,
      redirected: res.redirected,
    };
  };

  try {
    let res: Response;
    try {
      res = await fetch(url, { method: "HEAD", signal: controller.signal });
    } catch {
      // Some servers (many Icecast mounts) don't support HEAD — fall back
      // to a small ranged GET and abort immediately after headers land.
      res = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-1024" },
        signal: controller.signal,
      });
    }

    const ok = res.ok || res.status === 206;
    return finish(res, ok);
  } catch {
    return {
      online: false,
      status: "offline",
      httpStatus: null,
      contentType: null,
      finalUrl: url,
      redirected: false,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Wraps probeUrl with the overall validation timeout from the spec. */
async function probeUrlWithTimeout(url: string): Promise<StreamProbeResult> {
  return Promise.race([
    probeUrl(url),
    new Promise<StreamProbeResult>((resolve) =>
      setTimeout(
        () =>
          resolve({
            online: false,
            status: "offline",
            httpStatus: null,
            contentType: null,
            finalUrl: url,
            redirected: false,
          }),
        VALIDATION_TIMEOUT_MS
      )
    ),
  ]);
}

/** Public wrapper: probe any URL directly (used by the Live Radio test
 * endpoint, which validates provider-supplied streams rather than ones
 * stored in our own `streams` table). Still bounded by the same
 * connect/validation timeouts — never downloads the full stream. */
export async function probeStreamUrl(url: string): Promise<StreamProbeResult> {
  return probeUrlWithTimeout(url);
}

/**
 * Returns cached online/offline status for a station's primary stream,
 * re-checking only if the cache has expired. This intentionally avoids
 * hammering broadcaster infrastructure — see STREAM_CHECK_CACHE_MS.
 */
export async function getStationStatus(stationId: string): Promise<{
  online: boolean | null;
  status: StreamStatus | null;
  checkedAt: string | null;
  contentType?: string | null;
  finalUrl?: string | null;
}> {
  const stream = db
    .prepare(
      `SELECT id, stream_url, stream_type, last_checked, status
       FROM streams
       WHERE station_id = ? AND is_active = 1
       ORDER BY priority ASC
       LIMIT 1`
    )
    .get(stationId) as StreamRow | undefined;

  if (!stream) {
    return { online: null, status: null, checkedAt: null };
  }

  const isFresh =
    stream.last_checked && Date.now() - new Date(stream.last_checked).getTime() < CACHE_MS;

  if (isFresh) {
    return {
      online: stream.status === "online",
      status: (stream.status as StreamStatus) ?? "unverified",
      checkedAt: stream.last_checked,
    };
  }

  const result = await probeUrlWithTimeout(stream.stream_url);
  const checkedAt = new Date().toISOString();

  db.prepare(`UPDATE streams SET status = ?, last_checked = ? WHERE id = ?`).run(
    result.status,
    checkedAt,
    stream.id
  );

  return {
    online: result.online,
    status: result.status,
    checkedAt,
    contentType: result.contentType,
    finalUrl: result.finalUrl,
  };
}
