export type StreamType = "mp3" | "aac" | "ogg" | "hls" | "unknown";

export type StreamStatus = "online" | "offline" | "unverified" | "unsupported" | "cors_blocked";

export interface StationStream {
  url: string;
  type: StreamType;
  priority: number;
}

export interface RadioStation {
  id: string;
  name: string;
  /** Local FM stations have a frequency; Live Radio stations may not. */
  frequency?: number;
  city?: string;
  state?: string;
  country: string;
  language?: string;
  genre?: string;
  logo?: string | null;
  /** Primary/best stream URL, kept for convenience & backwards compatibility. */
  streamUrl: string | null;
  streamType?: StreamType;
  /** All known streams for this station, primary first, used for fallback. */
  streams: StationStream[];
  website?: string | null;
  isActive?: boolean;
  /**
   * True when this station's stream is a placeholder/demo stream rather
   * than the broadcaster's own verified feed. The UI must surface this,
   * and the Play button must not pretend it's a real broadcaster stream.
   */
  isDemo?: boolean;
  /**
   * "Local FM" stations come from our own city/frequency database.
   * "Live Radio" stations come live from the radio directory provider
   * and may not correspond to any FM frequency at all.
   */
  source?: "local-fm" | "live-radio";
  /**
   * Reflects the *directory's* last health check (or our own DB check),
   * NOT whether audio is currently playing in this browser — that's
   * `PlayerState.status === "playing"` / the LIVE indicator, which is a
   * completely separate concept. See README → "Database stream status
   * vs. Player status".
   */
  streamStatus?: StreamStatus;
  clickCount?: number;
}

export interface City {
  id: string;
  name: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface LiveCategory {
  id: string;
  label: string;
  type: "country" | "tag";
  value: string;
}

export type PlaybackStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "buffering"
  | "error";

export interface PlayerState {
  station: RadioStation | null;
  status: PlaybackStatus;
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  volume: number;
  muted: boolean;
  error: string | null;
  /** Index into station.streams currently being attempted (fallback chain). */
  activeStreamIndex: number;
}

export interface StationStatusResponse {
  online: boolean | null;
  status?: StreamStatus | null;
  checkedAt: string | null;
  contentType?: string | null;
  finalUrl?: string | null;
}
