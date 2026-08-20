import { Router } from "express";
import { db } from "../database/db";
import { attachStreams, type StationRow } from "./localStations";

export const citiesRouter = Router();

/** GET /api/cities — list every city, grouped by state on the client. */
citiesRouter.get("/", (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, name, state, country, latitude, longitude FROM cities ORDER BY state, name`
    )
    .all();
  res.json(rows);
});

/** GET /api/cities/search?q= — fast city autocomplete. */
citiesRouter.get("/search", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  if (!q) return res.json([]);

  const rows = db
    .prepare(
      `SELECT id, name, state, country FROM cities
       WHERE lower(name) LIKE ? OR lower(state) LIKE ?
       ORDER BY name LIMIT 25`
    )
    .all(`%${q}%`, `%${q}%`);
  res.json(rows);
});

/**
 * GET /api/cities/nearest?lat=&lng= — used by the "detect my location"
 * flow after the client has resolved a lat/lng (e.g. via reverse geocode
 * or directly). Returns the closest known city by simple great-circle
 * distance — fine at city-level granularity.
 */
citiesRouter.get("/nearest", (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: true, message: "lat and lng query params are required" });
  }

  const rows = db
    .prepare(
      `SELECT id, name, state, country, latitude, longitude FROM cities
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL`
    )
    .all() as Array<{ id: string; name: string; state: string; country: string; latitude: number; longitude: number }>;

  if (rows.length === 0) {
    return res.status(404).json({ error: true, message: "No cities available" });
  }

  const toRad = (d: number) => (d * Math.PI) / 180;
  const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    const R = 6371;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };

  let nearest = rows[0];
  let best = Infinity;
  for (const c of rows) {
    const d = distanceKm(lat, lng, c.latitude, c.longitude);
    if (d < best) {
      best = d;
      nearest = c;
    }
  }

  res.json({ ...nearest, distanceKm: Math.round(best) });
});

/** GET /api/cities/:city/stations — stations for a given city name. */
citiesRouter.get("/:city/stations", (req, res) => {
  const cityName = req.params.city;

  const city = db
    .prepare(`SELECT id, name, state, country FROM cities WHERE lower(name) = lower(?)`)
    .get(cityName) as { id: string } | undefined;

  if (!city) {
    return res.status(404).json({ error: true, message: `No city found named "${cityName}"` });
  }

  const stations = db
    .prepare(
      `SELECT s.id, s.name, s.frequency, s.language, s.genre, s.logo, s.website,
              s.is_active as isActive, s.is_demo as isDemo,
              c.name as city, c.state, c.country
       FROM stations s
       JOIN cities c ON c.id = s.city_id
       WHERE s.city_id = ?
       ORDER BY s.frequency ASC`
    )
    .all(city.id) as unknown as StationRow[];

  res.json(attachStreams(stations));
});
