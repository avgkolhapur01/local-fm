import { useEffect, useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import type { City } from "../types/radio";
import LocationButton from "./LocationButton";
import { useLocation } from "../hooks/useLocation";

interface CitySelectorProps {
  cities: City[];
  onSelect: (city: City) => void;
  onClose: () => void;
}

export default function CitySelector({ cities, onSelect, onClose }: CitySelectorProps) {
  const [query, setQuery] = useState("");
  const { status, errorMessage, detectLocation } = useLocation();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? cities.filter((c) => c.name.toLowerCase().includes(q) || (c.state ?? "").toLowerCase().includes(q))
      : cities;

    const groups = new Map<string, City[]>();
    for (const c of filtered) {
      const key = c.state || c.country;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [cities, query]);

  const handleDetect = async () => {
    const city = await detectLocation();
    if (city) onSelect(city);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Select location">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-bg-secondary sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="font-display text-lg font-semibold">Select Location</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full bg-card text-text-secondary hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3">
            <Search size={16} className="text-text-secondary" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city"
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
              aria-label="Search city"
            />
          </div>

          <div className="mt-3">
            <LocationButton onClick={handleDetect} status={status} />
            {(status === "denied" || status === "error") && errorMessage && (
              <p className="mt-2 text-center text-xs text-error">{errorMessage}</p>
            )}
          </div>
        </div>

        <div className="mt-2 flex-1 overflow-y-auto px-5 pb-8">
          {grouped.length === 0 && <p className="mt-6 text-center text-sm text-text-secondary">No cities match “{query}”.</p>}

          {grouped.map(([state, list]) => (
            <div key={state} className="mt-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">{state}</h3>
              <ul className="space-y-1">
                {list.map((city) => (
                  <li key={city.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(city)}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-text-primary transition-colors hover:bg-card"
                    >
                      {city.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
