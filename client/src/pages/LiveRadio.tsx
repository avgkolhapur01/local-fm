import { useEffect, useMemo, useState } from "react";
import { Radio as RadioIcon } from "lucide-react";
import SearchBar from "../components/SearchBar";
import StationList from "../components/StationList";
import { radioApi } from "../services/radioApi";
import type { LiveCategory, RadioStation } from "../types/radio";

export default function LiveRadio() {
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<LiveCategory | null>(null);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RadioStation[] | null>(null);
  const [providerError, setProviderError] = useState(false);

  useEffect(() => {
    radioApi.getLiveCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    setProviderError(false);
    const request = activeCategory
      ? activeCategory.type === "country"
        ? radioApi.getLiveByCountry(activeCategory.value)
        : radioApi.getLiveByGenre(activeCategory.value)
      : radioApi.getLiveStations();

    request
      .then((data) => {
        setStations(data);
        if (data.length === 0) setProviderError(true);
      })
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    const results = await radioApi.searchLiveStations(q);
    setSearchResults(results);
  };

  const visible = useMemo(() => (query.trim() ? searchResults ?? [] : stations), [query, searchResults, stations]);

  return (
    <div className="pb-4">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-text-primary">
        <span className="h-2.5 w-2.5 rounded-full bg-error" /> Live Radio
      </h1>
      <p className="mb-4 text-sm text-text-secondary">
        Listen to real Internet radio stations from around the world, right now.
      </p>

      <SearchBar placeholder="Search live stations" onSearch={handleSearch} />

      {!query.trim() && categories.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${
              activeCategory === null ? "bg-accent text-white" : "bg-card text-text-secondary"
            }`}
          >
            Popular
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${
                activeCategory?.id === c.id ? "bg-accent text-white" : "bg-card text-text-secondary"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <section className="mt-5">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">
          {query.trim() ? "Search results" : "Now Live"}
        </h2>

        {providerError && !loading ? (
          <div className="rounded-card bg-card/60 px-6 py-10 text-center">
            <RadioIcon className="mx-auto mb-3 text-text-secondary" size={26} />
            <p className="text-sm text-text-secondary">
              The live radio directory is temporarily unavailable, or returned no currently-verified stations for
              this category. Try Popular, or search for a station by name.
            </p>
          </div>
        ) : (
          <StationList
            stations={visible}
            loading={loading}
            emptyTitle="No live stations found"
            emptyDescription="Try a different search or category."
          />
        )}
      </section>

      <p className="mt-6 text-center text-[11px] text-text-secondary">
        Live Radio is powered by the Radio Browser community directory (radio-browser.info). Streams come directly
        from each broadcaster — Local FM does not host or record any audio.
      </p>
    </div>
  );
}
