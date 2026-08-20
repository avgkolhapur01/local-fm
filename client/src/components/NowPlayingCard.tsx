import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Radio as RadioIcon } from "lucide-react";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { EqualizerBars } from "./AudioPlayer";
import FavoriteButton from "./FavoriteButton";
import { useFavorites } from "../hooks/useFavorites";

// Desktop-only floating counterpart to AudioPlayer — same store, same
// actions, just the compact glass-card presentation from the redesign.
// SkipBack/SkipForward are shown disabled: there's no queue/playlist
// concept in the player store, so they're inert rather than fake.
export default function NowPlayingCard() {
  const player = useAudioPlayer();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { station, status, isPlaying, isLoading, isBuffering, volume, muted } = player;

  if (!station) {
    return (
      <div className="hidden w-80 shrink-0 flex-col items-center justify-center rounded-3xl bg-card p-8 text-center shadow-2xl lg:flex">
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-white/5 text-text-secondary">
          <RadioIcon size={22} />
        </span>
        <p className="text-sm text-text-secondary">Pick a station or tune the dial to start listening.</p>
      </div>
    );
  }

  const busy = isLoading || isBuffering;

  return (
    <div className="hidden w-80 shrink-0 flex-col rounded-3xl bg-card p-5 shadow-2xl lg:flex">
      <div className="flex items-start justify-between">
        {status === "playing" ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-error">
            <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-error" /> LIVE
          </span>
        ) : (
          <span className="text-xs font-semibold text-text-secondary">
            {isLoading ? "CONNECTING…" : isBuffering ? "BUFFERING…" : "PAUSED"}
          </span>
        )}
        <FavoriteButton active={isFavorite(station.id)} onToggle={() => toggleFavorite(station)} />
      </div>

      <p className="mt-3 truncate font-display text-xl font-semibold text-text-primary">{station.name}</p>
      <p className="text-xs text-text-secondary">
        {typeof station.frequency === "number" ? `${station.frequency.toFixed(1)} FM • ` : ""}
        {station.city ?? station.country}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        {isPlaying ? (
          <EqualizerBars animate />
        ) : (
          <div className="flex h-4 items-end gap-0.5" aria-hidden="true">
            {[30, 45, 25, 38].map((h, i) => (
              <span key={i} className="w-1 rounded-full bg-white/15" style={{ height: `${h}%` }} />
            ))}
          </div>
        )}
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-bg-secondary text-text-secondary">
          {station.logo ? (
            <img src={station.logo} alt="" className="h-14 w-14 object-cover" />
          ) : (
            <RadioIcon size={22} />
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-5">
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-label="Previous (no queue)"
          className="text-text-secondary/40 cursor-not-allowed"
        >
          <SkipBack size={18} fill="currentColor" />
        </button>

        <button
          type="button"
          onClick={player.togglePlayPause}
          aria-label={isPlaying ? "Pause" : "Play"}
          disabled={busy}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-white shadow-glow transition-transform active:scale-95 disabled:opacity-70"
        >
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : isPlaying ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-label="Next (no queue)"
          className="text-text-secondary/40 cursor-not-allowed"
        >
          <SkipForward size={18} fill="currentColor" />
        </button>

        <button
          type="button"
          onClick={player.toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="text-text-secondary hover:text-text-primary"
        >
          {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={muted ? 0 : volume}
        onChange={(e) => player.setVolume(Number(e.target.value))}
        aria-label="Volume"
        className="mt-4 h-1.5 w-full accent-accent"
      />
    </div>
  );
}
