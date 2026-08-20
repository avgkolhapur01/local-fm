import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_PATH = process.env.DATABASE_PATH || "./data/local-fm.sqlite";
const resolvedPath = path.resolve(process.cwd(), DATABASE_PATH);

// Make sure the folder that will hold the sqlite file exists.
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

// Uses Node's built-in `node:sqlite` module (stable in Node 22.5+) instead
// of the native `better-sqlite3` addon. This means `npm install` never
// needs to compile a native module — no Visual Studio Build Tools on
// Windows, no Xcode Command Line Tools on macOS, no build-essential on
// Linux. Requires Node.js 22.5.0 or newer; see README → Prerequisites.
export const db = new DatabaseSync(resolvedPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

/**
 * Creates all tables if they do not already exist.
 * Safe to call on every server boot.
 */
export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cities (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      state      TEXT,
      country    TEXT NOT NULL DEFAULT 'India',
      latitude   REAL,
      longitude  REAL,
      UNIQUE(name, state, country)
    );

    CREATE TABLE IF NOT EXISTS stations (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      frequency    REAL NOT NULL,
      city_id      TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
      language     TEXT,
      genre        TEXT,
      logo         TEXT,
      website      TEXT,
      is_active    INTEGER NOT NULL DEFAULT 1,
      is_demo      INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(city_id, frequency)
    );

    CREATE TABLE IF NOT EXISTS streams (
      id            TEXT PRIMARY KEY,
      station_id    TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
      stream_url    TEXT NOT NULL,
      stream_type   TEXT NOT NULL DEFAULT 'unknown', -- mp3 | aac | hls | unknown
      priority      INTEGER NOT NULL DEFAULT 0,        -- 0 = primary, 1 = backup, ...
      is_active     INTEGER NOT NULL DEFAULT 1,
      last_checked  TEXT,
      status        TEXT DEFAULT 'unknown'             -- online | offline | unknown
    );

    CREATE INDEX IF NOT EXISTS idx_stations_city ON stations(city_id);
    CREATE INDEX IF NOT EXISTS idx_stations_frequency ON stations(frequency);
    CREATE INDEX IF NOT EXISTS idx_stations_name ON stations(name);
    CREATE INDEX IF NOT EXISTS idx_streams_station ON streams(station_id);
  `);
}

export function slugify(...parts: (string | number)[]): string {
  return parts
    .join("-")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
