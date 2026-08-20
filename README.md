# Local FM — Internet Radio, Wherever You Are

Local FM lets people listen to their **local FM stations over the Internet**,
even on a phone with no FM receiver or FM radio app. A frequency (e.g.
`98.3 FM`) is used purely as an identifier — the app looks that
city + frequency up in its own database and hands the matching **public
Internet stream** to an HTML5/HLS audio player. It never captures, decodes,
or rebroadcasts an actual over-the-air FM signal.

```
CITY → FREQUENCY → STATION → INTERNET STREAM → AUDIO PLAYER
```

---

## 1. Project structure

```
local-fm/
├── client/                 React + Vite + TypeScript + Tailwind (PWA)
│   ├── src/
│   │   ├── components/     Header, StationCard, FrequencyDial, AudioPlayer, ...
│   │   ├── pages/          Home, Stations, Favorites, Settings
│   │   ├── hooks/          useAudioPlayer, useLocation, useFavorites
│   │   ├── services/       radioApi.ts, locationApi.ts
│   │   ├── store/          playerStore.ts (Zustand, single global <audio>)
│   │   ├── types/          radio.ts
│   │   └── data/           stations.ts (offline fallback demo data)
│   └── public/             manifest.json, sw.js, icons/
│
├── server/                 Node + Express + TypeScript + SQLite
│   └── src/
│       ├── routes/         cities.ts, stations.ts, streams.ts (admin)
│       ├── database/       db.ts (schema), seed.ts (demo data)
│       └── services/       streamChecker.ts (cached online/offline probe)
│
├── .env.example
└── package.json            npm workspaces root
```

---

## 2. Important concept: this is a directory, not a receiver

The app does **not** pick up real FM radio waves. It maps
`city + frequency → a station record → an Internet stream URL`, then plays
that stream with a normal web audio player. A station is uniquely
identified by **city + frequency**, since the same frequency (e.g. `98.3`)
is reused by different broadcasters in different cities.

All seed/demo data ships with **clearly marked placeholder streams**
(SomaFM, a free, legally-streamable Internet radio service) so the app is
usable out of the box without impersonating a real broadcaster. Every demo
station is flagged `isDemo: true` in the API and shows a **"Demo stream"**
badge in the UI. Replace these before showing the app to real users — see
[§8](#8-how-to-replace-demo-streams-with-verified-streams).

---

## 2b. Two modes: Local FM vs. Live Radio

**Local FM** — browse by city + FM frequency, backed by our own SQLite
`cities`/`stations`/`streams` tables (see §6). This is where the demo
placeholder streams live (§8).

**🔴 Live Radio** (`/live`) — a separate section, not tied to any FM
frequency, backed live by [Radio Browser](https://www.radio-browser.info),
a free, public, keyless, community-maintained directory of real Internet
radio streams. The backend calls it server-side (§11, `/api/radio/*`), so
no API key ever reaches the browser, and results are cached briefly
(§11 → Caching) so we don't hammer the directory on every keystroke.

Only stations the directory's own health check most recently marked
`lastcheckok` are ever returned — Live Radio never shows "thousands of
offline/unverified stations," per the brief. That `streamStatus` field
reflects the **directory's** last check, which is a different thing from
the **player's** `LIVE` indicator — the badge only appears once *this
browser* actually starts hearing audio (`audio.play()` resolves and the
`playing` event fires). A station can be `streamStatus: "online"` in the
list and still show `PAUSED`/`CONNECTING` until you press play.

Both modes share one `RadioStation` type, one global player, one
favorites list, and one recently-played list — `frequency` is simply
`undefined` for Live Radio stations, and the UI (station cards, mini
player, full player) adapts automatically.



- **Node.js 22.5.0 or newer** (the server uses Node's built-in `node:sqlite`
  module — no native compiler, Visual Studio Build Tools, or Xcode Command
  Line Tools required). Check your version with `node -v`; upgrade at
  https://nodejs.org if needed.
- npm 9+

---

## 4. Install & run locally

From the repo root:

```bash
npm install                # installs client + server workspaces
cp .env.example server/.env
cp .env.example client/.env   # Vite only reads VITE_-prefixed vars from this file
npm run seed                # creates & seeds the SQLite database
npm run dev                 # runs the API (port 4000) and the client (port 5173) together
```

Then open **http://localhost:5173**.

Run them separately if you prefer two terminals:

```bash
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173
```

---

## 5. Production build

```bash
npm run build         # builds both server (tsc) and client (vite build)
npm run start          # runs the compiled server from server/dist
```

The compiled client lives in `client/dist/` — serve it with any static
host (see §11).

---

## 6. Database setup

The server uses **SQLite** via Node's built-in `node:sqlite` module (no
native addon, no compiler needed — stable in Node 22.5+), stored at
`server/data/local-fm.sqlite` by default (configurable via
`DATABASE_PATH` in `server/.env`).

- `npm run seed` creates the schema (if missing) and inserts demo
  cities/stations/streams. It's idempotent — safe to re-run.
- Tables: `cities`, `stations`, `streams` (one station can have several
  streams — primary + backups — ordered by `priority`).

**Migrating to PostgreSQL/Supabase later:** the schema in
`server/src/database/db.ts` uses plain SQL with no SQLite-only syntax
beyond `datetime('now')`. Swap `node:sqlite`'s `DatabaseSync` for `pg`/
`postgres`, adjust that one default-timestamp expression, and the route
files (`routes/*.ts`) need no changes since they only use parameterized SQL.

---

## 7. Environment variables

See `.env.example` at the repo root for the full, documented list. Key ones:

| Variable | Used by | Purpose |
|---|---|---|
| `PORT` | server | API port (default `4000`) |
| `DATABASE_PATH` | server | SQLite file location |
| `CORS_ORIGIN` | server | Comma-separated allowed origins |
| `STREAM_CHECK_CACHE_MS` | server | How long a stream online/offline check is cached |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | server | API rate limiting |
| `VITE_API_BASE_URL` | client | Base URL the client calls for the API |

No API keys are required to run the demo — reverse geocoding uses the free
OpenStreetMap Nominatim API (see `client/src/services/locationApi.ts`).

---

## 8. How to replace demo streams with verified streams

1. Confirm you have the right, and permission, to link/embed the
   broadcaster's public Internet stream.
2. Use the local admin API (no auth in V1 — dev tool only, see §12):

   ```bash
   # Add a brand-new station
   curl -X POST http://localhost:4000/api/admin/stations \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Radio Mirchi",
       "frequency": 98.3,
       "city": "Pune",
       "state": "Maharashtra",
       "language": "Hindi",
       "genre": "Bollywood",
       "streamUrl": "https://<verified-stream-url>",
       "streamType": "mp3",
       "website": "https://radiomirchi.com",
       "isActive": true,
       "isDemo": false
     }'
   ```

3. Or edit an existing seeded row directly in `server/src/database/seed.ts`
   (swap `demoStreamUrl` for the verified URL and set `is_demo: 0` in the
   insert), then re-run `npm run seed` against a fresh database.
4. Add backup streams for resilience:

   ```bash
   curl -X POST http://localhost:4000/api/admin/stations/<station-id>/streams \
     -H "Content-Type: application/json" \
     -d '{"streamUrl": "https://backup-url", "streamType": "aac", "priority": 1}'
   ```

   The player automatically falls back to the next `priority` stream if
   the current one errors out.

---

## 9. How to add a new city

Cities are created automatically the first time a station references
them via the admin API (`POST /api/admin/stations`, see §8) — just pass a
new `city`/`state`. To pre-seed many cities without stations yet, insert
directly into the `cities` table, or extend the `CITIES` array in
`server/src/database/seed.ts`. The schema has no hard limit — it's built
to hold thousands of cities.

---

## 10. How to add a new station (admin API)

```
POST   /api/admin/stations                 create
PATCH  /api/admin/stations/:id             edit fields (name, frequency, language, genre, logo, website, isActive)
DELETE /api/admin/stations/:id             delete
POST   /api/admin/stations/:id/streams     add a backup stream
DELETE /api/admin/streams/:id              remove a stream
POST   /api/admin/streams/:id/test         probe a stream right now
```

⚠️ This router has **no authentication in V1** — it's meant only for local
development. Add auth (API key, session, etc.) before deploying it
publicly, or don't expose `/api/admin` at all in production.

---

## 11. Public API reference

```
GET  /api/cities
GET  /api/cities/search?q=
GET  /api/cities/nearest?lat=&lng=
GET  /api/cities/:city/stations

GET  /api/stations
GET  /api/stations/:id
GET  /api/stations/search?q=
GET  /api/stations/frequency/:frequency
GET  /api/stations/:id/status
POST /api/stations/test

GET  /api/fm/:city                        alias for /api/cities/:city/stations
GET  /api/fm/:city/frequency/:frequency   alias for /api/stations/frequency/:frequency, scoped to :city

GET  /api/radio/live                      "Now Live" — popular, directory-verified stations
GET  /api/radio/categories                curated category chips (India, World, Bollywood, News, ...)
GET  /api/radio/search?q=
GET  /api/radio/country/:country
GET  /api/radio/genre/:genre              queries the directory by tag
POST /api/radio/test                      body: { "stationId": "..." }
```

All error responses are clean JSON: `{ "error": true, "message": "..." }`.

### Live Radio: provider, caching, and attribution

`/api/radio/*` is powered by [Radio Browser](https://www.radio-browser.info)
via the `RadioProvider` abstraction in
`server/src/services/radioProvider.ts` — swap in a different directory
later by implementing that same interface; no route or player code needs
to change. No API key is required or exposed to the browser: the browser
only ever talks to **our** backend, which talks to the directory
server-side, per the brief's required architecture.

- Every `/api/radio/*` list endpoint filters to stations the directory's
  own health check most recently marked **online** (`lastcheckok`) —
  broken/unverified stations are never returned to the client.
- Responses are cached in-memory for 10 minutes
  (`server/src/services/cache.ts`) so browsing categories or repeating a
  search doesn't re-hit the external API every time.
- `/api/radio/search` and `/api/radio/test` have a stricter rate limit
  (30 requests/minute/IP) than the rest of the API, since free-text
  search and on-demand stream testing are the most abuse-prone endpoints.
- `POST /api/radio/test` only accepts a `stationId` this server itself
  returned from the directory in roughly the last 20 minutes (tracked in
  the same cache) — it is **not** an open URL tester, matching the same
  restriction as `/api/stations/test`.
- Radio Browser asks integrators to identify their app via User-Agent
  (see `radioProvider.ts` — currently `LocalFM/1.0`) rather than
  spoofing a browser; update that string with your own contact info if
  you deploy this publicly.

### Stream diagnostics

```
POST /api/stations/test          body: { "stationId": "..." }
```

Runs an **un-cached** probe of a station's primary stream right now and
reports `status` (`online` / `offline` / `unverified` / `unsupported`),
the response `contentType`, the final URL after redirects, and whether
the content type looks like something a browser can actually play. This
intentionally only accepts a `stationId` already in our database — it is
**not** an open `/api/proxy?url=...`-style endpoint, so it can't be used
to probe arbitrary third-party hosts.

You can run the same kind of check yourself from a terminal:

```bash
curl -I -L "https://ice.somafm.com/groovesalad"
```

`-L` follows redirects; `-I` sends a HEAD request so you only fetch
headers, never the (endless) audio body itself. If a station's server
rejects HEAD, drop `-I` and add `-r 0-1024` to fetch just the first
~1KB instead of the full, continuous stream.

There's also an in-app version of this: open **Settings → Developer →
Audio debug panel** while a station is loaded. It shows the live
`<audio>` element state (readyState, networkState, current source,
HLS.js status, last media error) and has a **"Test current stream"**
button that calls the endpoint above for whatever station is currently
loaded.

### Verified vs. unverified demo streams

| Station (demo city: Pune) | Primary stream | Status |
|---|---|---|
| Radio Mirchi (98.3) | `https://ice.somafm.com/groovesalad` (MP3) + `ice5.somafm.com/groovesalad-128-aac` (AAC fallback) | ✅ Verified against SomaFM's own docs, 2026-08-18 |
| Red FM (93.5) | `https://ice.somafm.com/indiepop` (MP3) | ✅ Verified 2026-08-18 |
| Radio City (91.1) | `https://ice.somafm.com/secretagent` (MP3) | ✅ Verified 2026-08-18 |
| Big FM (92.7) | `https://ice.somafm.com/dronezone` (MP3) | ✅ Verified 2026-08-18 |
| Vividh Bharati (101.0) | `https://ice.somafm.com/dronezone` (MP3) | ✅ Verified 2026-08-18 |
| Fever FM (104.0) | `https://ice.somafm.com/beatblender` (MP3) | ✅ Verified 2026-08-18 |

All of the above are demo placeholders (`isDemo: true`, shown with a
"Demo stream" badge) — real audio from SomaFM, but not the actual named
broadcaster's own feed. **No HLS demo stream ships in this project.**
Unofficial mirrors of major broadcasters' HLS manifests exist online, but
several (e.g. the BBC's) are explicitly reverse-engineered workarounds
around access restrictions the broadcaster put there on purpose — using
them would violate this project's own "only legitimate, public streams"
rule. The HLS playback path (`hls.js` + native Safari HLS) is fully
implemented and code-reviewed but not demonstrated with a bundled URL;
add your own verified `.m3u8` stream via the admin API (§10) to test it
— `streamType: "hls"` is all it needs.

### Background playback & lock-screen controls

The player integrates the **Media Session API** (`navigator.mediaSession`)
where the browser supports it: station name/frequency/city show up as
lock-screen/notification metadata, with play/pause/stop controls wired
to the same global player. Support and behavior vary by browser/OS —
this is a platform capability the app cannot force, not a guarantee.

---

## 12. Deploying

**Frontend (`client/`)** — any static host works (Vercel, Netlify,
Cloudflare Pages, S3 + CDN):

```bash
npm run build:client
# deploy the contents of client/dist/
```

Set `VITE_API_BASE_URL` at build time to point at your deployed API.

**Backend (`server/`)** — any Node host (Render, Railway, Fly.io, a VPS):

```bash
npm run build:server
npm run start
```

Set `CORS_ORIGIN` to your deployed frontend's origin. If you migrate off
SQLite (recommended for multi-instance deployments), point
`DATABASE_PATH`/connection config at your PostgreSQL/Supabase instance
(see §6).

**Database** — for a single small instance, the SQLite file can simply
live on a persistent disk/volume next to the server process. For anything
larger or multi-region, migrate to PostgreSQL/Supabase as noted in §6.

---

## 13. PWA installation

- **Android/Chrome:** open the deployed site → browser menu → "Install
  app" (or the install icon in the address bar).
- **iOS/Safari:** open the site → Share → "Add to Home Screen".

Once installed, Local FM launches full-screen with its own icon. The
service worker (`client/public/sw.js`) caches the app shell for fast/
offline loading, but deliberately **never caches audio streams or API
responses** — live radio and station lists should always come from the
network when available.

**Background playback:** continues automatically as long as the
browser/OS keeps the tab or PWA process alive — this is a platform
capability the app cannot force, and behavior varies by browser/OS
(generally most reliable on Android Chrome and installed PWAs; iOS Safari
is more restrictive about background audio in web views).

---

## 14. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Client shows "No stations found" for every city | Server not running, or DB not seeded — run `npm run dev:server` and `npm run seed`. |
| "Unable to connect to this station" | The stream URL is offline/unreachable, or blocked by CORS from the browser. Try the "Try Again" button, or open the station's official website link if shown. |
| Geolocation does nothing | Browser permission was denied, or the device has no location support — the app always falls back to manual city selection, never crashes. |
| CORS errors in the browser console | Make sure `CORS_ORIGIN` in `server/.env` includes the exact origin the client is served from (protocol + host + port). |
| Audio won't autoplay after selecting a station | Most mobile browsers block autoplay without a user gesture — tap play once; subsequent stations you pick from the same session usually autoplay fine. |
| PWA "Install" option missing | Requires HTTPS (or localhost) and a valid `manifest.json` + registered service worker — check the browser's DevTools → Application tab for manifest/SW errors. |
| `'tsx' is not recognized` / `'concurrently' is not recognized` (Windows) | `npm install` didn't finish (often because an earlier native-module build failed and aborted the whole install). Delete `node_modules` at the repo root and in `client/`/`server/`, then re-run `npm install` from the repo root and check for **any** red error before assuming it's just these two packages. |
| `node:sqlite` not found / `Cannot find module 'node:sqlite'` | Your Node.js version is older than 22.5. Run `node -v` and upgrade at https://nodejs.org — this project intentionally uses the built-in SQLite module so nobody needs a C++ build toolchain. |

---

## 15. Legal / content notes

- Local FM stores only **public station metadata** (name, frequency,
  city, website, public stream URL, logo where permitted) — never
  downloaded or rebroadcast audio.
- It links directly to each broadcaster's own public Internet stream
  rather than proxying/rehosting audio, except where an optional,
  explicitly-flagged server-side proxy is added for streams that are
  technically and legally appropriate to proxy (not included by default).
- **Live Radio** streams come from [Radio Browser](https://www.radio-browser.info),
  a free, community-maintained directory. Local FM does not host, cache,
  or claim ownership of any station's audio — playback connects the
  listener's browser directly to the broadcaster's own stream URL.
- See the in-app disclaimer on the **Settings** page.

### A note on the "demo streams" Local FM ships with

Local FM's own city/frequency database (§8) currently ships with
placeholder streams from SomaFM — these are **real, legally-streamable
Internet audio**, not fabricated URLs, and every one is explicitly
labeled `isDemo: true` with a visible "Demo stream" badge in the UI. They
are deliberately left **playable** rather than disabled: the whole point
of the app is that pressing Play produces real audio, and a Local FM
section where every station shows "stream unavailable" until you've
manually sourced dozens of real broadcaster URLs would defeat that. What
they are **not** is invisible or dishonestly presented as the named
broadcaster's actual feed — replace them with verified streams via the
admin API (§8) whenever you have real ones for a station.

---

## 16. Roadmap (architecture is ready to extend)

Now-playing metadata & album art, trending/popular stations, ratings,
user accounts with cloud-synced favorites, multi-country/worldwide radio,
a Radio Garden–style world map, Car mode / Android Auto / CarPlay,
Chromecast/AirPlay, sleep timer, alarm, equalizer, audio visualizer.
#   l o c a l - f m  
 