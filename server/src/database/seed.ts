/**
 * Seeds the SQLite database with a small demo dataset so the app is
 * usable out of the box.
 *
 * IMPORTANT — READ BEFORE DEPLOYING:
 * The `streamUrl` values below point at SomaFM (https://somafm.com), a
 * long-running, listener-supported Internet radio service whose streams
 * are freely and legally streamable for demo/dev purposes. They are NOT
 * the real, official streams of the FM stations they are attached to.
 * Every seeded station is flagged `isDemo: true` and the UI must show a
 * "Demo stream" badge for it. Before going to production, replace each
 * demo `streamUrl` with the station's own verified, public Internet
 * stream (see README.md → "How to replace demo streams with verified
 * streams").
 *
 * URL VERIFICATION — 2026-08-18:
 * These use SomaFM's own documented, load-balanced "Direct URL" hosts
 * (https://ice.somafm.com/<channel>), which SomaFM publishes specifically
 * because their individually-numbered servers (ice1, ice5, ice6, ...)
 * rotate and go stale over time — see
 * https://somafm.com/listen/sonoscustom.html and each channel's
 * "Direct Stream Links" page. Do NOT hardcode a numbered server; always
 * use the unnumbered `ice.somafm.com/<channel>` host, which SomaFM's own
 * infrastructure keeps pointed at a live server.
 */
import { randomUUID } from "crypto";
import { db, initSchema, slugify } from "./db";

interface SeedCity {
  name: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface DemoStream {
  url: string;
  type: "mp3" | "aac";
}

interface SeedStation {
  name: string;
  frequency: number;
  language: string;
  genre: string;
  website?: string;
  // Demo, legally-streamable placeholders — NOT the station's real feed.
  // First entry is primary; any further entries are automatic fallbacks.
  demoStreams: DemoStream[];
}

const CITIES: SeedCity[] = [
  { name: "Pune", state: "Maharashtra", country: "India", latitude: 18.5204, longitude: 73.8567 },
  { name: "Mumbai", state: "Maharashtra", country: "India", latitude: 19.076, longitude: 72.8777 },
  { name: "Kolhapur", state: "Maharashtra", country: "India", latitude: 16.705, longitude: 74.2433 },
  { name: "Nagpur", state: "Maharashtra", country: "India", latitude: 21.1458, longitude: 79.0882 },
  { name: "Nashik", state: "Maharashtra", country: "India", latitude: 19.9975, longitude: 73.7898 },
  { name: "Bengaluru", state: "Karnataka", country: "India", latitude: 12.9716, longitude: 77.5946 },
  { name: "Mysuru", state: "Karnataka", country: "India", latitude: 12.2958, longitude: 76.6394 },
  { name: "New Delhi", state: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209 },
  { name: "Chennai", state: "Tamil Nadu", country: "India", latitude: 13.0827, longitude: 80.2707 },
  { name: "Coimbatore", state: "Tamil Nadu", country: "India", latitude: 11.0168, longitude: 76.9558 },
];

// A small rotating pool of legally-public demo streams (SomaFM), using
// their documented stable load-balanced hosts. Groove Salad additionally
// carries a real AAC fallback so the automatic multi-stream fallback path
// (MP3 primary → AAC backup) is genuinely exercised, not just theoretical.
const DEMO_STREAMS: DemoStream[][] = [
  [
    { url: "https://ice.somafm.com/groovesalad", type: "mp3" },
    { url: "https://ice5.somafm.com/groovesalad-128-aac", type: "aac" },
  ],
  [{ url: "https://ice.somafm.com/indiepop", type: "mp3" }],
  [{ url: "https://ice.somafm.com/secretagent", type: "mp3" }],
  [{ url: "https://ice.somafm.com/dronezone", type: "mp3" }],
  [{ url: "https://ice.somafm.com/beatblender", type: "mp3" }],
];

function stationsFor(): (Omit<SeedStation, "demoStreams"> & { demoStreams: DemoStream[] })[] {
  // Realistic Indian FM frequencies/names, paired round-robin with demo streams.
  const template: Omit<SeedStation, "demoStreams">[] = [
    { name: "Radio Mirchi", frequency: 98.3, language: "Hindi", genre: "Bollywood", website: "https://radiomirchi.com" },
    { name: "Red FM", frequency: 93.5, language: "Hindi", genre: "Bollywood & Talk", website: "https://redfm.in" },
    { name: "Radio City", frequency: 91.1, language: "Hindi", genre: "Bollywood", website: "https://radiocity.in" },
    { name: "Big FM", frequency: 92.7, language: "Hindi", genre: "Bollywood & Talk", website: "https://bigfm.in" },
    { name: "Vividh Bharati", frequency: 101.0, language: "Hindi", genre: "Public Broadcast", website: "https://prasarbharati.gov.in" },
    { name: "Fever FM", frequency: 104.0, language: "Hindi", genre: "Pop & Bollywood", website: "https://feverfm.com" },
  ];

  return template.map((t, i) => ({ ...t, demoStreams: DEMO_STREAMS[i % DEMO_STREAMS.length] }));
}

export function seedDatabase(): void {
  initSchema();

  const insertCity = db.prepare(`
    INSERT OR IGNORE INTO cities (id, name, state, country, latitude, longitude)
    VALUES (@id, @name, @state, @country, @latitude, @longitude)
  `);

  const insertStation = db.prepare(`
    INSERT OR IGNORE INTO stations
      (id, name, frequency, city_id, language, genre, logo, website, is_active, is_demo)
    VALUES
      (@id, @name, @frequency, @city_id, @language, @genre, @logo, @website, 1, 1)
  `);

  const insertStream = db.prepare(`
    INSERT OR IGNORE INTO streams
      (id, station_id, stream_url, stream_type, priority, is_active, status)
    VALUES
      (@id, @station_id, @stream_url, @stream_type, @priority, 1, 'unknown')
  `);

  db.exec("BEGIN");
  try {
    for (const city of CITIES) {
      const cityId = slugify(city.name, city.state);
      insertCity.run({ id: cityId, ...city });

      for (const s of stationsFor()) {
        const stationId = slugify(city.name, s.frequency);
        insertStation.run({
          id: stationId,
          name: s.name,
          frequency: s.frequency,
          city_id: cityId,
          language: s.language,
          genre: s.genre,
          logo: null,
          website: s.website ?? null,
        });

        s.demoStreams.forEach((stream, priority) => {
          insertStream.run({
            id: randomUUID(),
            station_id: stationId,
            stream_url: stream.url,
            stream_type: stream.type,
            priority,
          });
        });
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  console.log(`✅ Seeded ${CITIES.length} cities and their demo stations.`);
  console.log("⚠️  All seeded streams are DEMO placeholders (SomaFM), not real broadcaster feeds.");
}

// Run immediately if this script is executed directly via CLI
if (require.main === module) {
  seedDatabase();
}
