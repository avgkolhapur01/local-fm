import { useEffect, useState } from "react";
import { Heart, History } from "lucide-react";
import StationList from "../components/StationList";
import EmptyState from "../components/EmptyState";
import { useFavorites } from "../hooks/useFavorites";
import { getRecentlyPlayed } from "../store/playerStore";
import type { RadioStation } from "../types/radio";

export default function Favorites() {
  const { favorites } = useFavorites();
  const [recent, setRecent] = useState<RadioStation[]>([]);

  useEffect(() => {
    setRecent(getRecentlyPlayed());
  }, []);

  return (
    <div className="pb-4">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-text-primary">
        <Heart size={22} className="text-accent" fill="currentColor" /> Favorites
      </h1>
      <p className="mb-4 text-sm text-text-secondary">Stations you've saved for quick access</p>

      {favorites.length === 0 ? (
        <EmptyState icon={Heart} title="No favorites yet" description="Tap ♡ on any station to save it." />
      ) : (
        <StationList stations={favorites} />
      )}

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
          <History size={14} className="text-text-secondary" /> Recently Played
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-text-secondary">Stations you play will show up here.</p>
        ) : (
          <StationList stations={recent} />
        )}
      </section>
    </div>
  );
}
