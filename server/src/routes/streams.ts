import { Router } from "express";
import { randomUUID } from "crypto";
import { db, slugify } from "../database/db";
import { getStationStatus } from "../services/streamChecker";

/**
 * Simple developer/admin endpoints for managing the station database.
 *
 * NOTE: There is deliberately no authentication here in V1 — this is a
 * local development tool only. Do NOT expose this router publicly
 * without adding auth first (see README → Security).
 */
export const streamsRouter = Router();

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** POST /api/admin/stations — create a station + its primary stream. */
streamsRouter.post("/stations", (req, res) => {
  const {
    name,
    frequency,
    city, // city name — will be created if it doesn't exist
    state,
    country = "India",
    language,
    genre,
    streamUrl,
    streamType = "unknown",
    website,
    logo,
    isActive = true,
    isDemo = false,
  } = req.body ?? {};

  if (!name || !frequency || !city || !streamUrl) {
    return res.status(400).json({
      error: true,
      message: "name, frequency, city and streamUrl are required",
    });
  }
  if (!isValidUrl(streamUrl)) {
    return res.status(400).json({ error: true, message: "streamUrl must be a valid http(s) URL" });
  }

  const cityId = slugify(city, state ?? "");
  db.prepare(
    `INSERT OR IGNORE INTO cities (id, name, state, country) VALUES (?, ?, ?, ?)`
  ).run(cityId, city, state ?? null, country);

  const stationId = slugify(city, frequency);
  db.prepare(
    `INSERT INTO stations (id, name, frequency, city_id, language, genre, logo, website, is_active, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(stationId, name, frequency, cityId, language ?? null, genre ?? null, logo ?? null, website ?? null, isActive ? 1 : 0, isDemo ? 1 : 0);

  db.prepare(
    `INSERT INTO streams (id, station_id, stream_url, stream_type, priority, is_active)
     VALUES (?, ?, ?, ?, 0, 1)`
  ).run(randomUUID(), stationId, streamUrl, streamType);

  res.status(201).json({ id: stationId });
});

/** PATCH /api/admin/stations/:id — edit station fields. */
streamsRouter.patch("/stations/:id", (req, res) => {
  const fields = req.body ?? {};
  const allowed = ["name", "frequency", "language", "genre", "logo", "website", "is_active"];
  const updates: string[] = [];
  const params: any[] = [];

  for (const key of allowed) {
    const bodyKey = key === "is_active" ? "isActive" : key;
    if (fields[bodyKey] !== undefined) {
      updates.push(`${key} = ?`);
      params.push(key === "is_active" ? (fields[bodyKey] ? 1 : 0) : fields[bodyKey]);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: true, message: "No valid fields to update" });
  }

  params.push(req.params.id);
  const result = db.prepare(`UPDATE stations SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  if (result.changes === 0) {
    return res.status(404).json({ error: true, message: "Station not found" });
  }
  res.json({ updated: true });
});

/** DELETE /api/admin/stations/:id — remove a station and its streams. */
streamsRouter.delete("/stations/:id", (req, res) => {
  const result = db.prepare(`DELETE FROM stations WHERE id = ?`).run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: true, message: "Station not found" });
  }
  res.json({ deleted: true });
});

/** POST /api/admin/stations/:id/streams — add a backup stream. */
streamsRouter.post("/stations/:id/streams", (req, res) => {
  const { streamUrl, streamType = "unknown", priority = 1 } = req.body ?? {};
  if (!streamUrl || !isValidUrl(streamUrl)) {
    return res.status(400).json({ error: true, message: "A valid streamUrl is required" });
  }

  const station = db.prepare(`SELECT id FROM stations WHERE id = ?`).get(req.params.id);
  if (!station) {
    return res.status(404).json({ error: true, message: "Station not found" });
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO streams (id, station_id, stream_url, stream_type, priority, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`
  ).run(id, req.params.id, streamUrl, streamType, priority);

  res.status(201).json({ id });
});

/** DELETE /api/admin/streams/:id — remove a specific stream. */
streamsRouter.delete("/streams/:id", (req, res) => {
  const result = db.prepare(`DELETE FROM streams WHERE id = ?`).run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: true, message: "Stream not found" });
  }
  res.json({ deleted: true });
});

/** POST /api/admin/streams/:id/test — probe a single stream right now. */
streamsRouter.post("/streams/:id/test", async (req, res) => {
  const stream = db.prepare(`SELECT station_id FROM streams WHERE id = ?`).get(req.params.id) as
    | { station_id: string }
    | undefined;
  if (!stream) {
    return res.status(404).json({ error: true, message: "Stream not found" });
  }
  const status = await getStationStatus(stream.station_id);
  res.json(status);
});
