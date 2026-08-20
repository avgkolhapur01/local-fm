import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Radio as RadioIcon, History, X } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayerStore } from "../store/playerStore";

export default function MiniPlayer() {
  const station = usePlayerStore((s) => s.station);
  const status = usePlayerStore((s) => s.status);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const stop = usePlayerStore((s) => s.stop);

  if (!station) return null;

  const isPlaying = status === "playing";
  const busy = status === "loading" || status === "buffering";
  const isError = status === "error";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-accent-secondary/10 bg-bg-secondary p-2.5 shadow-lg lg:gap-5 lg:rounded-none lg:border-0 lg:border-t lg:px-6 lg:py-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-card text-accent lg:h-11 lg:w-11">
        {station.logo ? (
          <img src={station.logo} alt="" className="h-9 w-9 object-cover lg:h-11 lg:w-11" />
        ) : (
          <RadioIcon size={17} />
        )}
      </div>

      <div className="min-w-0 flex-1 lg:max-w-[14rem] lg:flex-none">
        <p className="truncate text-sm font-medium text-text-primary">{station.name}</p>
        <p className="truncate text-[11px] text-text-secondary">
          {typeof station.frequency === "number" ? `${station.frequency.toFixed(1)} FM ` : "LIVE "}
          {isError ? "• Unavailable" : isPlaying ? "• Live" : ""}
        </p>
      </div>

      <div className="hidden items-center gap-4 lg:flex">
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
          onClick={togglePlayPause}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white"
        >
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : isPlaying ? (
            <Pause size={17} fill="currentColor" />
          ) : (
            <Play size={17} fill="currentColor" className="ml-0.5" />
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
      </div>

      <button
        type="button"
        onClick={togglePlayPause}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-white lg:hidden"
      >
        {busy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : isPlaying ? (
          <Pause size={16} fill="currentColor" />
        ) : (
          <Play size={16} fill="currentColor" className="ml-0.5" />
        )}
      </button>

      <div className="hidden flex-1 items-center gap-2 lg:flex">
        <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} className="text-text-secondary hover:text-text-primary">
          {muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Volume"
          className="h-1.5 w-full max-w-xs accent-accent"
        />
      </div>

      <Link
        to="/favorites"
        aria-label="Recently played"
        className="hidden shrink-0 text-text-secondary hover:text-text-primary lg:block"
      >
        <History size={19} />
      </Link>

      <button
        type="button"
        onClick={stop}
        aria-label="Stop and close player"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-secondary hover:text-text-primary"
      >
        <X size={16} />
      </button>
    </div>
  );
}
