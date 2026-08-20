import { Router } from "express";
import { db } from "../database/db";
import { attachStreams, STATION_SELECT, type StationRow } from "./localStations";

/**
 * Thin aliases matching the brief's requested `/api/fm/...` shape.
 * These intentionally reuse the exact same query logic as
 * `/api/cities/:city/stations` and `/api/stations/frequency/:frequency`
 * (see routes/cities.ts and routes/stations.ts) rather than duplicating
 * it — `/api/fm` is just a friendlier, Local-FM-specific entry point.
 */
export const fmRouter = Router();

/** GET /api/fm/:city — Local FM stations for a city, ordered by frequency. */
fmRouter.get("/:city", (req, res) => {
  const city = db
    .prepare(`SELECT id FROM cities WHERE lower(name) = lower(?)`)
    .get(req.params.city) as { id: string } | undefined;

  if (!city) {
    return res.status(404).json({ error: true, message: `No city found named "${req.params.city}"` });
  }

  const rows = db
    .prepare(`${STATION_SELECT} WHERE s.city_id = ? ORDER BY s.frequency ASC`)
    .all(city.id) as unknown as StationRow[];

  res.json(attachStreams(rows));
});

/** GET /api/fm/:city/frequency/:frequency — exact/near frequency lookup within a city. */
fmRouter.get("/:city/frequency/:frequency", (req, res) => {
  const freq = Number(req.params.frequency);
  if (Number.isNaN(freq)) {
    return res.status(400).json({ error: true, message: "Invalid frequency" });
  }

  const rows = db
    .prepare(
      `${STATION_SELECT} WHERE lower(c.name) = lower(?) AND ABS(s.frequency - ?) < 0.05 ORDER BY s.frequency ASC`
    )
    .all(req.params.city, freq) as unknown as StationRow[];

  res.json(attachStreams(rows));
});
