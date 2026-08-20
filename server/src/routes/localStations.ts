import { db } from "../database/db";

export const STATION_SELECT = `
  SELECT s.id, s.name, s.frequency, s.language, s.genre, s.logo, s.website,
         s.is_active as isActive, s.is_demo as isDemo,
         c.name as city, c.state, c.country
  FROM stations s
  JOIN cities c ON c.id = s.city_id
`;

export interface StationRow {
  id: string;
  name: string;
  frequency: number;
  language: string | null;
  genre: string | null;
  logo: string | null;
  website: string | null;
  isActive: number;
  isDemo: number;
  city: string;
  state: string | null;
  country: string;
}

interface StreamRow {
  id: string;
  station_id: string;
  stream_url: string;
  stream_type: string;
  priority: number;
  is_active: number;
  status: string | null;
}

export function attachStreams(stations: StationRow[]) {
  if (stations.length === 0) return [];
  const ids = stations.map((s) => s.id);
  const placeholders = ids.map(() => "?").join(",");
  const streams = db
    .prepare(
      `SELECT id, station_id, stream_url, stream_type, priority, is_active, status
       FROM streams WHERE station_id IN (${placeholders}) AND is_active = 1
       ORDER BY priority ASC`
    )
    .all(...ids) as unknown as StreamRow[];

  const byStation = new Map<string, StreamRow[]>();
  for (const st of streams) {
    if (!byStation.has(st.station_id)) byStation.set(st.station_id, []);
    byStation.get(st.station_id)!.push(st);
  }

  return stations.map((s) => {
    const stationStreams = byStation.get(s.id) ?? [];
    const primary = stationStreams[0];
    return {
      ...s,
      isActive: Boolean(s.isActive),
      isDemo: Boolean(s.isDemo),
      source: "local-fm",
      streamUrl: primary?.stream_url ?? null,
      streamType: primary?.stream_type ?? "unknown",
      streamStatus: primary?.status ?? (primary ? "unverified" : "offline"),
      streams: stationStreams.map((st) => ({
        url: st.stream_url,
        type: st.stream_type,
        priority: st.priority,
      })),
    };
  });
}
