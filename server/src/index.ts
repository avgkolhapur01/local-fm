import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import { initSchema } from "./database/db";
import { citiesRouter } from "./routes/cities";
import { stationsRouter } from "./routes/stations";
import { streamsRouter } from "./routes/streams";
import { fmRouter } from "./routes/fm";
import { radioRouter } from "./routes/radio";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || "0.0.0.0";
const CORS_ORIGIN = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",");

initSchema();

app.use(
  cors({
    origin: CORS_ORIGIN,
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
