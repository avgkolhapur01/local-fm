import { create } from "zustand";
import Hls from "hls.js";
import type { PlaybackStatus, PlayerState, RadioStation, StationStream } from "../types/radio";

const RECENTLY_PLAYED_KEY = "localfm:recently-played";
const RECENTLY_PLAYED_MAX = 10;
const MAX_AUTO_FALLBACK_ATTEMPTS = 3;

// ── One single <audio> element for the whole app ───────────────────────
// Created lazily so it only exists in the browser (not during any SSR/
// build-time import), and reused across every page/component so audio
// never restarts, duplicates, or stops when the user navigates between
// pages — there is exactly one <audio> element for the entire app.
let audioEl: HTMLAudioElement | null = null;
let hls: Hls | null = null;

// Incremented on every play()/stop() call. Async events (canplay, error,
// HLS callbacks) capture the token at the time they were scheduled and
// bail out if it no longer matches — this prevents a slow/stale event
// from an old station affecting playback after the user has already
// switched to a new one.
let playToken = 0;

function getAudioEl(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "none";
    audioEl.loop = false;
    // Cross-origin <audio> playback does NOT require CORS headers from
    // the broadcaster (unlike canvas/WebAudio use) — do not set
    // crossOrigin here, as that would incorrectly require CORS and break
    // otherwise-perfectly-playable public Icecast/Shoutcast streams.
  }
  return audioEl;
}

function teardownHls() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
}

function describeMediaError(el: HTMLAudioElement): string {
  const code = el.error?.code;
  switch (code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return "Playback was aborted.";
    case MediaError.MEDIA_ERR_NETWORK:
      return "A network error interrupted the stream.";
    case MediaError.MEDIA_ERR_DECODE:
      return "This stream's audio could not be decoded by your browser.";
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "This stream format isn't supported by your browser.";
    default:
      return "The Internet stream could not be played.";
  }
}

function normalizeStreams(station: RadioStation): StationStream[] {
  if (station.streams?.length) return station.streams;
  if (station.streamUrl) return [{ url: station.streamUrl, type: station.streamType ?? "unknown", priority: 0 }];
  return [];
}

function isLocalFmStation(station: RadioStation): boolean {
  return station.source === "local-fm" || typeof station.frequency === "number";
}

function stationIsUnavailable(station: RadioStation): boolean {
  const streams = normalizeStreams(station);
  // Local FM stations (frequency is a number) should not be playable
  // unless the server has explicitly marked their primary stream as
  // `online`. For Live/Directory stations we keep the previous
  // tolerant behavior (allow `unverified`), because directory
  // providers sometimes report unverified but playable streams.
  if (typeof station.frequency === "number") {
    return streams.length === 0 || station.streamStatus !== "online";
  }

  return streams.length === 0 || station.streamStatus === "offline" || station.streamStatus === "unsupported";
}

interface PlayerActions {
  play: (station: RadioStation, startAtStreamIndex?: number) => void;
  togglePlayPause: () => void;
  pause: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  retryOrFallback: () => void;
  clearError: () => void;
}

const initialState: PlayerState = {
  station: null,
  status: "idle",
  isPlaying: false,
  isLoading: false,
  isBuffering: false,
  volume: 0.85,
  muted: false,
  error: null,
  activeStreamIndex: 0,
};

function pushRecentlyPlayed(station: RadioStation) {
  try {
    const raw = localStorage.getItem(RECENTLY_PLAYED_KEY);
    const list: RadioStation[] = raw ? JSON.parse(raw) : [];
    const deduped = [station, ...list.filter((s) => s.id !== station.id)].slice(0, RECENTLY_PLAYED_MAX);
    localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(deduped));
  } catch {
    /* localStorage may be unavailable (private mode) — fail silently */
  }
}

function updateMediaSession(station: RadioStation | null, playing: boolean) {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

  if (!station) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
    return;
  }

  navigator.mediaSession.metadata = new MediaMetadata({
    title: station.name,
    artist:
      typeof station.frequency === "number"
        ? `${station.frequency.toFixed(1)} FM • ${station.city ?? station.country}`
        : `Live • ${station.city ?? station.country}`,
    album: "Local FM",
    artwork: station.logo ? [{ src: station.logo, sizes: "512x512", type: "image/png" }] : [],
  });
  navigator.mediaSession.playbackState = playing ? "playing" : "paused";
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => {
  function setStatus(status: PlaybackStatus) {
    set({
      status,
      isPlaying: status === "playing",
      isLoading: status === "loading",
      isBuffering: status === "buffering",
      error: status === "error" || status === "paused" ? get().error : null,
    });
    updateMediaSession(get().station, status === "playing");
  }

  // Attempts to actually start playback and correctly distinguishes a
  // browser-imposed autoplay block (not an error — user just needs to
  // tap play) from a genuine failure (which should be surfaced/retried).
  function attemptPlay(token: number) {
    const el = getAudioEl();
    el.play().catch((err: unknown) => {
      if (token !== playToken) return; // a newer station/stop superseded this attempt
      const name = (err as { name?: string })?.name;
      if (name === "AbortError") {
        // Playback was interrupted by a subsequent load()/pause() call —
        // not a real failure, so don't surface an error for it.
        return;
      }
      if (name === "NotAllowedError") {
        setStatus("paused");
        set({ error: "Playback was blocked by the browser. Tap play to start the station." });
      } else {
        setStatus("error");
        set({ error: "Unable to start playback for this stream." });
      }
    });
  }

  function attachStream(url: string, type: string | undefined, token: number) {
    const el = getAudioEl();
    teardownHls();

    const isM3u8 = type === "hls" || url.includes(".m3u8");

    if (isM3u8 && Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 30 });
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        if (token !== playToken || !hls) return;
        hls.loadSource(url);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (token !== playToken) return;
        attemptPlay(token);
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (token !== playToken) return;
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              get().retryOrFallback();
          }
        }
      });
      hls.attachMedia(el);
    } else if (isM3u8 && el.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari / iOS: native HLS support, no hls.js needed.
      el.src = url;
      el.load();
      attemptPlay(token);
    } else if (isM3u8) {
      // HLS requested but unsupported in this browser (no MSE, no native
      // HLS) — fail fast with a clear message instead of silently trying
      // and mysteriously producing no audio.
      setStatus("error");
      set({ error: "This station's stream format (HLS) isn't supported by your browser." });
    } else {
      // Native playback: MP3/AAC/Icecast — the browser plays these
      // directly based on the response's Content-Type, regardless of the
      // URL's file extension.
      el.src = url;
      el.load();
      attemptPlay(token);
    }
  }

  function bindElementEvents() {
    const el = getAudioEl();

    el.onwaiting = () => setStatus("buffering");
    el.onplaying = () => setStatus("playing");
    el.onpause = () => {
      if (get().status !== "error") setStatus("paused");
    };
    el.onstalled = () => setStatus("buffering");
    el.onerror = () => {
      const message = describeMediaError(el);
      set({ error: message });
      get().retryOrFallback();
    };
    el.oncanplay = () => {
      const s = get().status;
      if (s === "loading" || s === "buffering") {
        attemptPlay(playToken);
      }
    };

    // Media Session lock-screen/notification controls (where supported).
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", () => get().togglePlayPause());
      navigator.mediaSession.setActionHandler("pause", () => get().pause());
      navigator.mediaSession.setActionHandler("stop", () => get().stop());
    }

    // Network recovery: if we come back online while a station errored
    // out or got stuck buffering, try once — never poll/retry repeatedly.
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        const { station, status } = get();
        if (station && (status === "error" || status === "buffering")) {
          get().play(station, 0);
        }
      });
    }
  }

  bindElementEvents();

  return {
    ...initialState,

    play: (station, startAtStreamIndex = 0) => {
      const el = getAudioEl();
      const streams = normalizeStreams(station);

      if (stationIsUnavailable(station)) {
        playToken += 1;
        el.pause();
        el.removeAttribute("src");
        el.load();
        teardownHls();
        set({
          station,
          activeStreamIndex: 0,
          status: "error",
          isLoading: false,
          isPlaying: false,
          isBuffering: false,
          error: "No working Internet stream is available for this local FM station.",
        });
        return;
      }

      const index = Math.min(startAtStreamIndex, streams.length - 1, MAX_AUTO_FALLBACK_ATTEMPTS - 1);
      const stream = streams[index];

      playToken += 1;
      const token = playToken;

      set({
        station,
        activeStreamIndex: index,
        status: "loading",
        isLoading: true,
        isPlaying: false,
        error: null,
      });

      el.volume = get().muted ? 0 : get().volume;
      attachStream(stream.url, stream.type, token);
      pushRecentlyPlayed(station);
    },

    togglePlayPause: () => {
      const { isPlaying, station } = get();
      const el = getAudioEl();
      if (!station) return;

      if (isPlaying) {
        el.pause();
      } else if (el.src || hls) {
        setStatus("loading");
        attemptPlay(playToken);
      } else {
        get().play(station);
      }
    },

    pause: () => {
      getAudioEl().pause();
    },

    stop: () => {
      playToken += 1; // invalidate any in-flight async events
      const el = getAudioEl();
      el.pause();
      el.removeAttribute("src");
      el.load();
      teardownHls();
      updateMediaSession(null, false);
      set({ ...initialState, volume: get().volume, muted: get().muted });
    },

    setVolume: (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));
      const el = getAudioEl();
      el.volume = get().muted ? 0 : clamped;
      set({ volume: clamped });
    },

    toggleMute: () => {
      const el = getAudioEl();
      const nextMuted = !get().muted;
      el.volume = nextMuted ? 0 : get().volume;
      set({ muted: nextMuted });
    },

    retryOrFallback: () => {
      const { station, activeStreamIndex } = get();
      if (!station) return;

      const streams = normalizeStreams(station);
      const nextIndex = activeStreamIndex + 1;

      if (isLocalFmStation(station)) {
        const el = getAudioEl();
        playToken += 1;
        el.pause();
        el.removeAttribute("src");
        el.load();
        teardownHls();
        setStatus("error");
        set({
          error:
            get().error ??
            "No working Internet stream is available for this local FM station.",
          isPlaying: false,
          isLoading: false,
          isBuffering: false,
        });
      } else if (nextIndex < streams.length && nextIndex < MAX_AUTO_FALLBACK_ATTEMPTS) {
        // Try the next backup stream automatically (max 3 attempts total).
        get().play(station, nextIndex);
      } else {
        setStatus("error");
        set({
          error:
            get().error ??
            "Unable to connect to this station. It may be offline or its stream may currently be unavailable.",
        });
      }
    },

    clearError: () => set({ error: null, status: "idle" }),
  };
});

export function getRecentlyPlayed(): RadioStation[] {
  try {
    const raw = localStorage.getItem(RECENTLY_PLAYED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Exposes live diagnostics for the debug panel (Settings → dev tools). */
export function getAudioDebugSnapshot() {
  const el = audioEl;
  return {
    src: el?.currentSrc || el?.src || null,
    readyState: el?.readyState ?? null,
    networkState: el?.networkState ?? null,
    paused: el?.paused ?? null,
    muted: el?.muted ?? null,
    volume: el?.volume ?? null,
    hlsSupported: Hls.isSupported(),
    hlsActive: hls !== null,
    lastMediaError: el?.error ? describeMediaError(el) : null,
  };
}
