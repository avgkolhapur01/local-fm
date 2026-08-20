import { Play, Pause, Loader2, Radio as RadioIcon } from "lucide-react";
import type { RadioStation } from "../types/radio";
import { usePlayerStore } from "../store/playerStore";

interface StationChipProps {
  station: RadioStation;
}

// Same play/pause behavior as StationCard, presented as a small vertical
// "preset" tile for the horizontal Top Stations strip.
export default function StationChip({ station }: StationChipProps) {
  const currentStation = usePlayerStore((s) => s.station);
  const status = usePlayerStore((s) => s.status);
  const play = usePlayerStore((s) => s.play);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);

  const isCurrent = currentStation?.id === station.id;
  const isPlaying = isCurrent && status === "playing";
  const isLoading = isCurrent && (status === "loading" || status === "buffering");
  const hasStream = Boolean(station.streamUrl) && station.streams.length > 0;

  const handlePlay = () => {
    if (!hasStream) return;
    if (isCurrent) togglePlayPause();
    else play(station);
  };

  return (
    <button
      type="button"
      onClick={handlePlay}
      disabled={!hasStream}
      aria-label={!hasStream ? `${station.name} unavailable` : isPlaying ? `Pause ${station.name}` : `Play ${station.name}`}
      className={`group flex w-28 shrink-0 flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-colors sm:w-32 ${
        isCurrent ? "border-accent/50 bg-accent/10" : "border-transparent bg-card hover:border-white/10"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <div className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-xl bg-bg-secondary text-text-secondary">
        {station.logo ? (
          <img src={station.logo} alt="" className="h-16 w-16 object-cover" loading="lazy" />
        ) : (
          <RadioIcon size={22} aria-hidden="true" />
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          {isLoading ? (
            <Loader2 size={20} className="animate-spin text-white" />
          ) : isPlaying ? (
            <Pause size={20} fill="currentColor" className="text-white" />
          ) : (
            <Play size={20} fill="currentColor" className="ml-0.5 text-white" />
          )}
        </span>
        {isPlaying && (
          <span className="absolute bottom-1 right-1 flex h-3.5 items-end gap-0.5" aria-hidden="true">
            <span className="w-0.5 animate-eq1 rounded-full bg-success" style={{ height: "100%" }} />
            <span className="w-0.5 animate-eq2 rounded-full bg-success" style={{ height: "100%" }} />
            <span className="w-0.5 animate-eq3 rounded-full bg-success" style={{ height: "100%" }} />
          </span>
        )}
      </div>

      <div className="min-w-0">
        {typeof station.frequency === "number" ? (
          <p className="text-xs font-semibold text-accent-secondary">{station.frequency.toFixed(1)} FM</p>
        ) : (
          <p className="flex items-center justify-center gap-1 text-[10px] font-semibold text-error">
            <span className="h-1.5 w-1.5 rounded-full bg-error" /> LIVE
          </p>
        )}
        <p className="truncate text-xs font-medium text-text-primary">{station.name}</p>
      </div>
    </button>
  );
}
