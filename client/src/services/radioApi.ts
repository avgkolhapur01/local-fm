import type { City, LiveCategory, RadioStation, StationStatusResponse, StreamType, StreamStatus } from "../types/radio";
import { FALLBACK_STATIONS } from "../data/stations";

/** Raw shape returned by GET /api/radio/* — see server/src/routes/radio.ts toApiShape(). */
interface LiveRawStation {
  id: string;
  name: string;
  country: string;
  countryCode: string | null;
  language: string | null;
  genre: string | null;
  logo: string | null;
  website: string | null;
  streamUrl: string;
  streamType: StreamType;
  bitrateKbps: number | null;
  streamStatus: StreamStatus;
  clickCount: number;
}

function normalizeLiveStation(raw: LiveRawStation): RadioStation {
  return {
    id: raw.id,
    name: raw.name,
    country: raw.country,
    language: raw.language ?? undefined,
    genre: raw.genre ?? undefined,
    logo: raw.logo,
    website: raw.website,
    streamUrl: raw.streamUrl,
    streamType: raw.streamType,
    streams: [{ url: raw.streamUrl, type: raw.streamType, priority: 0 }],
    isActive: true,
    isDemo: false,
    source: "live-radio",
    streamStatus: raw.streamStatus,
    clickCount: raw.clickCount,
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* ignore body parse errors */
    }
    throw new ApiError(message, res.status);
  }

  return (await res.json()) as T;
}

// Simple in-memory cache so we don't refetch the same city/list within a
// session, per the "avoid unnecessary API calls" performance requirement.
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function cachedRequest<T>(key: string, path: string): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data as T;

  const data = await request<T>(path);
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

export const radioApi = {
  async getCities(): Promise<City[]> {
    try {
      return await cachedRequest<City[]>("cities", "/cities");
    } catch {
      return [];
    }
  },

  async searchCities(query: string): Promise<City[]> {
    if (!query.trim()) return [];
    try {
      return await request<City[]>(`/cities/search?q=${encodeURIComponent(query)}`);
    } catch {
      return [];
    }
  },

  async getNearestCity(lat: number, lng: number): Promise<(City & { distanceKm: number }) | null> {
    try {
      return await request(`/cities/nearest?lat=${lat}&lng=${lng}`);
    } catch {
      return null;
    }
  },

  async getStationsByCity(city: string): Promise<RadioStation[]> {
    try {
      return await cachedRequest<RadioStation[]>(`stations:${city}`, `/cities/${encodeURIComponent(city)}/stations`);
    } catch {
      // Never leave the user with a blank screen if the API is down.
      return FALLBACK_STATIONS.filter((s) => (s.city ?? "").toLowerCase() === city.toLowerCase());
    }
  },

  async getAllStations(): Promise<RadioStation[]> {
    try {
      return await cachedRequest<RadioStation[]>("stations:all", "/stations");
    } catch {
      return FALLBACK_STATIONS;
    }
  },

  async searchStations(query: string): Promise<RadioStation[]> {
    if (!query.trim()) return [];
    try {
      return await request<RadioStation[]>(`/stations/search?q=${encodeURIComponent(query)}`);
    } catch {
      const q = query.toLowerCase();
      return FALLBACK_STATIONS.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.city ?? "").toLowerCase().includes(q) ||
          (s.frequency !== undefined && String(s.frequency).startsWith(q))
      );
    }
  },

  async getStationByFrequency(frequency: number, city?: string): Promise<RadioStation[]> {
    try {
      const qs = city ? `?city=${encodeURIComponent(city)}` : "";
      return await request<RadioStation[]>(`/stations/frequency/${frequency}${qs}`);
    } catch {
      return [];
    }
  },

  async getStationStatus(id: string): Promise<StationStatusResponse> {
    try {
      return await request<StationStatusResponse>(`/stations/${id}/status`);
    } catch {
      return { online: null, checkedAt: null };
    }
  },

  /**
   * Triggers an on-demand, un-cached stream diagnostic for a station
   * that's already in our database. This does NOT accept arbitrary URLs
   * — only known station IDs — matching the backend's restriction.
   */
  async testStream(stationId: string): Promise<{
    success: boolean;
    status: string;
    contentType: string | null;
    finalUrl: string | null;
    supportsBrowserPlayback: boolean;
    checkedAt: string | null;
  } | null> {
    try {
      return await request(`/stations/test`, {
        method: "POST",
        body: JSON.stringify({ stationId }),
      });
    } catch {
      return null;
    }
  },

  // ── Live Radio (real, external directory — see server radioProvider) ──

  async getLiveStations(): Promise<RadioStation[]> {
    try {
      const raw = await cachedRequest<LiveRawStation[]>("radio:live", "/radio/live");
      return raw.map(normalizeLiveStation);
    } catch {
      return [];
    }
  },

  async searchLiveStations(query: string): Promise<RadioStation[]> {
    if (!query.trim()) return [];
    try {
      const raw = await request<LiveRawStation[]>(`/radio/search?q=${encodeURIComponent(query)}`);
      return raw.map(normalizeLiveStation);
    } catch {
      return [];
    }
  },

  async getLiveByCountry(country: string): Promise<RadioStation[]> {
    try {
      const raw = await cachedRequest<LiveRawStation[]>(
        `radio:country:${country}`,
        `/radio/country/${encodeURIComponent(country)}`
      );
      return raw.map(normalizeLiveStation);
    } catch {
      return [];
    }
  },

  async getLiveByGenre(genre: string): Promise<RadioStation[]> {
    try {
      const raw = await cachedRequest<LiveRawStation[]>(
        `radio:genre:${genre}`,
        `/radio/genre/${encodeURIComponent(genre)}`
      );
      return raw.map(normalizeLiveStation);
    } catch {
      return [];
    }
  },

  async getLiveCategories(): Promise<LiveCategory[]> {
    try {
      return await cachedRequest<LiveCategory[]>("radio:categories", "/radio/categories");
    } catch {
      return [];
    }
  },

  /**
   * On-demand diagnostic for a Live Radio station. Restricted to station
   * ids the backend recently served (see server/src/routes/radio.ts) —
   * not an open URL tester.
   */
  async testLiveStream(stationId: string): Promise<{
    success: boolean;
    status: string;
    contentType: string | null;
    streamType: string;
    browserPlayable: boolean;
  } | null> {
    try {
      return await request(`/radio/test`, {
        method: "POST",
        body: JSON.stringify({ stationId }),
      });
    } catch {
      return null;
    }
  },
};

export { ApiError };
