import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import { db, initSchema } from "./database/db";
import { seedDatabase } from "./database/seed";
import { citiesRouter } from "./routes/cities";
import { stationsRouter } from "./routes/stations";
import { streamsRouter } from "./routes/streams";
import { fmRouter } from "./routes/fm";
import { radioRouter } from "./routes/radio";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || "0.0.0.0";

// Initialize tables and auto-seed if empty
initSchema();
try {
  const cityCount = db.prepare("SELECT count(*) as count FROM cities").get() as { count: number } | undefined;
  if (!cityCount || Number(cityCount.count) === 0) {
    console.log("Database empty on startup — running initial seed...");
    seedDatabase();
  }
} catch (err) {
  console.error("Auto-seed check error:", err);
}

// Flexible CORS setup: allows Firebase Hosting, localhost, and any origin configured via CORS_ORIGIN
const rawCorsOrigin = process.env.CORS_ORIGIN;
const defaultAllowed = [
  "https://local-fm.web.app",
  "https://local-fm.firebaseapp.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4000",
  "http://127.0.0.1:5173",
];

const customAllowed = rawCorsOrigin
  ? rawCorsOrigin.split(",").map((s) => s.trim()).filter(Boolean)
  : [];

const allowedOrigins = Array.from(new Set([...defaultAllowed, ...customAllowed]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      if (
        rawCorsOrigin === "*" ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".web.app") ||
        origin.endsWith(".firebaseapp.com") ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }
      // Since Local FM is a public directory API without session cookies, allow all origins
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
  })
);

app.use(express.json({ limit: "200kb" }));

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: "Too many requests, please slow down." },
});
app.use("/api", limiter);

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "local-fm-server",
    message: "Local FM API is running. Use /api/health or /api/stations",
    docs: "/api/health",
    time: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "local-fm-server", time: new Date().toISOString() });
});

app.use("/api/cities", citiesRouter);
app.use("/api/stations", stationsRouter);
app.use("/api/fm", fmRouter);
app.use("/api/radio", radioRouter);
// Admin/dev-only station management — NOT authenticated in V1, see README.
app.use("/api/admin", streamsRouter);

// 404 handler
app.use("/api", (req, res) => {
  res.status(404).json({ error: true, message: "Not found" });
});

// Central error handler — never leak stack traces to clients.
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: true, message: "Internal server error" });
});

app.listen(PORT, HOST, () => {
  console.log(`🎙️  Local FM API listening on http://${HOST}:${PORT}`);
});
