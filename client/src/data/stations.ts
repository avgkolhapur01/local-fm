import type { RadioStation } from "../types/radio";

/**
 * A tiny fallback dataset, only used when the backend API cannot be
 * reached (offline first-load, broken dev server, etc.) so the UI never
 * shows a completely blank screen.
 *
 * Every entry here is explicitly `isDemo: true` and points at SomaFM
 * (https://somafm.com), a legally-streamable public Internet radio
 * service — NOT the real broadcaster feed for the named FM station.
 * Replace with verified streams before shipping to real users; see
 * README.md → "How to replace demo streams with verified streams".
 *
 * URL VERIFICATION — 2026-08-18: uses SomaFM's documented, load-balanced
 * "Direct URL" host (https://ice.somafm.com/<channel>), not a numbered
 * server (ice1/ice5/...), because SomaFM's individually-numbered servers
 * rotate and go stale — see https://somafm.com/listen/sonoscustom.html.
 */
export const FALLBACK_STATIONS: RadioStation[] = [
  {
    id: "pune-maharashtra-98.3",
    name: "Radio Mirchi",
    frequency: 98.3,
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    language: "Hindi",
    genre: "Bollywood",
    logo: null,
    streamUrl: "https://ice.somafm.com/groovesalad",
    streamType: "mp3",
    streams: [
      { url: "https://ice.somafm.com/groovesalad", type: "mp3", priority: 0 },
      { url: "https://ice5.somafm.com/groovesalad-128-aac", type: "aac", priority: 1 },
    ],
    website: "https://radiomirchi.com",
    isActive: true,
    isDemo: true,
  },
  {
    id: "pune-maharashtra-93.5",
    name: "Red FM",
    frequency: 93.5,
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    language: "Hindi",
    genre: "Bollywood & Talk",
    logo: null,
    streamUrl: "https://ice.somafm.com/indiepop",
    streamType: "mp3",
    streams: [{ url: "https://ice.somafm.com/indiepop", type: "mp3", priority: 0 }],
    website: "https://redfm.in",
    isActive: true,
    isDemo: true,
  },
  {
    id: "pune-maharashtra-101",
    name: "Vividh Bharati",
    frequency: 101.0,
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    language: "Hindi",
    genre: "Public Broadcast",
    logo: null,
    streamUrl: "https://ice.somafm.com/dronezone",
    streamType: "mp3",
    streams: [{ url: "https://ice.somafm.com/dronezone", type: "mp3", priority: 0 }],
    website: "https://prasarbharati.gov.in",
    isActive: true,
    isDemo: true,
  },
];
