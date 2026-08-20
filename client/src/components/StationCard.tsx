import { Play, Pause, Loader2, Radio as RadioIcon } from "lucide-react";
import type { RadioStation } from "../types/radio";
import FavoriteButton from "./FavoriteButton";
import { useFavorites } from "../hooks/useFavorites";
import { usePlayerStore } from "../store/playerStore";

interface StationCardProps {
  station: RadioStation;
}

export default function StationCard({ station }: StationCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const currentStation = usePlayerStore((s) => s.station);
  const status = usePlayerStore((s) => s.status);
  const play = usePlayerStore((s) => s.play);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);

  const isCurrent = currentStation?.id === station.id;
  const isPlaying = isCurrent && status === "playing";
  const isLoading = isCurrent && (status === "loading" || status === "buffering");
  const hasStream =
    Boolean(station.streamUrl) &&
    station.streams.length > 0 &&
    // For local FM stations (numeric `frequency`) be stricter: only
    // allow play when the server has explicitly marked the primary
    // stream as `online`. Directory/Live stations may be `unverified`
    // but still playable by the browser, so keep existing behavior.
    (typeof station.frequency === "number"
      ? station.streamStatus === "online"
      : station.streamStatus !== "offline" && station.streamStatus !== "unsupported");

  const handlePlay = () => {
    if (!hasStream) return;
    if (isCurrent) {
      togglePlayPause();
    } else {
      play(station);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-card border p-3 transition-colors ${
        isCurrent ? "border-accent/40 bg-accent/5" : "border-transparent bg-card hover:border-white/10"
      }`}
    >
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-bg-secondary text-text-secondary">
        {station.logo ? (
          <img src={station.logo} alt="" className="h-12 w-12 rounded-2xl object-cover" loading="lazy" />
        ) : (
          <RadioIcon size={20} aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          {typeof station.frequency === "number" ? (
            <>
              <span className="font-display text-sm font-semibold text-accent">{station.frequency.toFixed(1)}</span>
              <span className="text-[11px] text-text-secondary">FM</span>
            </>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-error">
              <span className="h-1.5 w-1.5 rounded-full bg-error" /> LIVE
            </span>
          )}
          {station.isDemo && (
            <span className="ml-1 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
              Demo stream
            </span>
          )}
          {!hasStream && (
            <span className="ml-1 rounded-full bg-error/10 px-1.5 py-0.5 text-[10px] font-medium text-error">
              Unavailable
            </span>
          )}
        </div>
        <p className="truncate text-sm font-medium text-text-primary">{station.name}</p>
        <p className="truncate text-xs text-text-secondary">
          {[station.language, station.genre].filter(Boolean).join(" • ") || station.city || station.country}
        </p>
      </div>

      <FavoriteButton active={isFavorite(station.id)} onToggle={() => toggleFavorite(station)} />

      <button
        type="button"
        onClick={handlePlay}
        disabled={!hasStream}
        aria-label={!hasStream ? `${station.name} unavailable` : isPlaying ? `Pause ${station.name}` : `Play ${station.name}`}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white shadow-glow transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-text-secondary disabled:shadow-none"
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        ) : isPlaying ? (
          <Pause size={18} fill="currentColor" aria-hidden="true" />
        ) : (
          <Play size={18} fill="currentColor" className="ml-0.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
