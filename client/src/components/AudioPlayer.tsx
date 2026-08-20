import { Play, Pause, Volume2, VolumeX, Radio as RadioIcon, AlertTriangle, RotateCcw } from "lucide-react";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import FavoriteButton from "./FavoriteButton";
import { useFavorites } from "../hooks/useFavorites";

export function EqualizerBars({ animate }: { animate: boolean }) {
  const bars = ["eq1", "eq2", "eq3", "eq4"];
  return (
    <div className="flex h-4 items-end gap-0.5" aria-hidden="true">
      {bars.map((anim, i) => (
        <span
          key={i}
          className={`w-1 rounded-full bg-success ${animate ? `animate-${anim}` : ""}`}
          style={{ height: animate ? "100%" : "30%" }}
        />
      ))}
    </div>
  );
}

export default function AudioPlayer() {
  const player = useAudioPlayer();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { station, status, isPlaying, isLoading, isBuffering, volume, muted, error } = player;

  if (!station) {
    return (
      <div className="flex flex-col items-center justify-center rounded-card bg-card px-6 py-10 text-center">
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-white/5 text-text-secondary">
          <RadioIcon size={22} />
        </span>
        <p className="text-sm text-text-secondary">Pick a station or tune the dial to start listening.</p>
      </div>
    );
  }

  const busy = isLoading || isBuffering;

  return (
    <div className="rounded-card bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-bg-secondary text-text-secondary">
          {station.logo ? (
            <img src={station.logo} alt="" className="h-14 w-14 rounded-2xl object-cover" />
          ) : (
            <RadioIcon size={24} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold text-text-primary">{station.name}</p>
          <p className="text-xs text-text-secondary">
            {typeof station.frequency === "number" ? `${station.frequency.toFixed(1)} FM • ` : ""}
            {station.city ?? station.country}
          </p>

          <div className="mt-1.5 flex items-center gap-2">
            {status === "playing" && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-success">
                <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-success" /> LIVE
                <EqualizerBars animate />
              </span>
            )}
            {status === "paused" && !error && <span className="text-[11px] font-medium text-text-secondary">PAUSED</span>}
            {status === "paused" && error && (
              <span className="text-[11px] font-medium text-accent-secondary">Tap play to start</span>
            )}
            {isLoading && <span className="text-[11px] font-medium text-accent-secondary">Connecting to {station.name}…</span>}
            {isBuffering && <span className="text-[11px] font-medium text-accent-secondary">Buffering…</span>}
            {station.isDemo && (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                Demo stream
              </span>
            )}
          </div>
        </div>

        <FavoriteButton active={isFavorite(station.id)} onToggle={() => toggleFavorite(station)} />
      </div>

      {status === "paused" && error && (
        <p className="mt-3 text-center text-xs text-text-secondary">{error}</p>
      )}

      {status === "error" && error ? (
        <div className="mt-4 rounded-2xl bg-error/10 p-4 text-center">
          <AlertTriangle className="mx-auto mb-2 text-error" size={20} />
          <p className="text-sm text-text-primary">{error}</p>
          <button
            type="button"
            onClick={() => player.play(station)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-error/20 px-4 py-2 text-xs font-semibold text-error transition-colors hover:bg-error/30"
          >
            <RotateCcw size={13} /> Try Again
          </button>
          {station.website && (
            <p className="mt-2 text-xs text-text-secondary">
              You can also listen on the{" "}
              <a href={station.website} target="_blank" rel="noreferrer" className="underline">
                station's official website
              </a>
              .
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            onClick={player.togglePlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={busy}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent text-white shadow-glow transition-transform active:scale-95 disabled:opacity-70"
          >
            {busy ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : isPlaying ? (
              <Pause size={22} fill="currentColor" />
            ) : (
              <Play size={22} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={player.toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="text-text-secondary hover:text-text-primary"
          >
            {muted || volume === 0 ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => player.setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="h-1.5 w-full flex-1 accent-accent"
          />
        </div>
      )}

      <p className="mt-3 text-center text-[11px] text-text-secondary">
        Streaming ~{player.approxDataUsageMbPerHour} MB/hour (estimated)
      </p>
    </div>
  );
}
