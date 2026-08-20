import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import SearchBar from "../components/SearchBar";
import StationList from "../components/StationList";
import { radioApi } from "../services/radioApi";
import type { RadioStation } from "../types/radio";

type SortKey = "frequency" | "name" | "recent";

export default function Stations() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<string>("all");
  const [genre, setGenre] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("frequency");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setLoading(true);
    radioApi.getAllStations().then((data) => {
      setStations(data);
      setLoading(false);
    });
  }, []);

  const languages = useMemo(
    () => Array.from(new Set(stations.map((s) => s.language).filter(Boolean))) as string[],
    [stations]
  );
  const genres = useMemo(
    () => Array.from(new Set(stations.map((s) => s.genre).filter(Boolean))) as string[],
    [stations]
  );

  const filtered = useMemo(() => {
    let list = stations;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.city ?? "").toLowerCase().includes(q) ||
          (s.frequency !== undefined && String(s.frequency).startsWith(q))
      );
    }
    if (language !== "all") list = list.filter((s) => s.language === language);
    if (genre !== "all") list = list.filter((s) => s.genre === genre);

    const sorted = [...list];
    if (sort === "frequency") sorted.sort((a, b) => (a.frequency ?? 0) - (b.frequency ?? 0));
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    // "recent" relies on server ordering already applied for /stations?sort=recent;
    // for the client-filtered list we just keep insertion order as a reasonable fallback.

    return sorted;
  }, [stations, query, language, genre, sort]);

  return (
    <div className="pb-4">
      <h1 className="font-display text-2xl font-bold text-text-primary">Stations</h1>
      <p className="mb-4 text-sm text-text-secondary">Browse every FM station in the directory</p>

      <SearchBar placeholder="Search by name, city, or frequency" onSearch={setQuery} />

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-medium text-text-secondary hover:text-text-primary"
        >
          <SlidersHorizontal size={13} /> Filters
        </button>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort stations"
          className="rounded-full bg-card px-3.5 py-2 text-xs font-medium text-text-secondary focus:outline-none"
        >
          <option value="frequency">Frequency</option>
          <option value="name">Station Name</option>
          <option value="recent">Recently Added</option>
        </select>
      </div>

      {showFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-full bg-card px-3.5 py-2 text-xs text-text-secondary focus:outline-none"
            aria-label="Filter by language"
          >
            <option value="all">All languages</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="rounded-full bg-card px-3.5 py-2 text-xs text-text-secondary focus:outline-none"
            aria-label="Filter by genre"
          >
            <option value="all">All genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-5">
        <StationList
          stations={filtered}
          loading={loading}
          emptyDescription="Try adjusting your search or filters."
        />
      </div>
    </div>
  );
}
