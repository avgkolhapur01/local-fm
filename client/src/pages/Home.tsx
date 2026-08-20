import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon, MapPin, Radio as RadioIcon, ChevronRight, History } from "lucide-react";
import Header from "../components/Header";
import SearchBar from "../components/SearchBar";
import StationList from "../components/StationList";
import StationChip from "../components/StationChip";
import FrequencyDial from "../components/FrequencyDial";
import AudioPlayer from "../components/AudioPlayer";
import NowPlayingCard from "../components/NowPlayingCard";
import CitySelector from "../components/CitySelector";
import EmptyState from "../components/EmptyState";
import { radioApi } from "../services/radioApi";
import { getSavedCity, saveSelectedCity } from "../hooks/useLocation";
import { usePlayerStore, getRecentlyPlayed } from "../store/playerStore";
import type { City, RadioStation } from "../types/radio";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function Home() {
  const [city, setCity] = useState<City | null>(() => getSavedCity());
  const [allCities, setAllCities] = useState<City[]>([]);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [searchResults, setSearchResults] = useState<RadioStation[] | null>(null);
  const [dialFrequency, setDialFrequency] = useState(98.3);
  const [recent, setRecent] = useState<RadioStation[]>([]);

  const play = usePlayerStore((s) => s.play);

  useEffect(() => {
    radioApi.getCities().then(setAllCities);
    setRecent(getRecentlyPlayed());
  }, []);

  useEffect(() => {
    if (!city) {
      setShowCitySelector(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    radioApi
      .getStationsByCity(city.name)
      .then((data) => {
        setStations(data);
        if (typeof data[0]?.frequency === "number") setDialFrequency(data[0].frequency);
      })
      .finally(() => setLoading(false));
  }, [city]);

  const handleSelectCity = (c: City) => {
    setCity(c);
    saveSelectedCity(c);
    setShowCitySelector(false);
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    const results = await radioApi.searchStations(query);
    setSearchResults(results);
  };

  const nearby = useMemo(() => stations.slice(0, 6), [stations]);

  const handleDialChange = (freq: number) => {
    setDialFrequency(freq);
    const match = stations.find((s) => typeof s.frequency === "number" && Math.abs(s.frequency - freq) < 0.05);
    if (match) play(match);
  };

  return (
    <div className="pb-4">
      {/* Mobile header (desktop uses the global top bar instead) */}
      <div className="lg:hidden">
        <Header city={city} onChangeCity={() => setShowCitySelector(true)} />

        <div className="mt-6">
          <h1 className="font-signature text-3xl font-medium text-text-primary [text-shadow:0_2px_16px_rgba(0,0,0,0.55)]">
            {greeting()}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">Find your local radio</p>
        </div>

        <div className="mt-4">
          <SearchBar placeholder="Search station or frequency" onSearch={handleSearch} />
        </div>
      </div>

      {/* Desktop hero — headline + search over the photo, floating player alongside */}
      <div className="hidden lg:flex lg:items-start lg:justify-between lg:gap-10 lg:pb-6 lg:pt-4">
        <div className="max-w-xl">
          <h1 className="font-display text-5xl font-bold leading-tight text-text-primary [text-shadow:0_2px_20px_rgba(0,0,0,0.6)]">
            Feel the music
            <br />
            <span className="font-signature text-accent-secondary [text-shadow:0_2px_20px_rgba(0,0,0,0.6)]">
              of your city
            </span>
          </h1>
          <p className="mt-4 max-w-sm text-sm text-text-secondary [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
            Listen to your favourite FM stations or explore live radio from around the world.
          </p>
          <div className="mt-6 max-w-md">
            <SearchBar placeholder="Search station, frequency or city…" onSearch={handleSearch} />
          </div>
        </div>

        <NowPlayingCard />
      </div>

      {searchResults !== null ? (
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <SearchIcon size={14} className="text-text-secondary" /> Search results
          </h2>
          <StationList
            stations={searchResults}
            emptyTitle="No matches"
            emptyDescription="Try a different station name or frequency, like 98.3 or Mirchi."
          />
        </section>
      ) : (
        <>
          {/* Mobile: vertical nearby-stations list */}
          <section className="mt-6 lg:hidden">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Nearby Stations</h2>
              {city && (
                <span className="flex items-center gap-1 text-xs text-text-secondary">
                  <MapPin size={12} className="text-accent" /> {city.name}
                </span>
              )}
            </div>

            {!city ? (
              <EmptyState
                icon={MapPin}
                title="Set your city"
                description="Choose a city to see FM stations available near you."
                action={
                  <button
                    type="button"
                    onClick={() => setShowCitySelector(true)}
                    className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Select City
                  </button>
                }
              />
            ) : (
              <StationList
                stations={nearby}
                loading={loading}
                emptyDescription="We couldn't find an FM station for this location."
                emptyAction={
                  <button
                    type="button"
                    onClick={() => setShowCitySelector(true)}
                    className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Change City
                  </button>
                }
              />
            )}
          </section>

          <hr className="my-7 border-white/5 lg:hidden" />

          {/* Mobile: frequency dial + full player */}
          <section className="lg:hidden">
            <FrequencyDial frequency={dialFrequency} onChange={handleDialChange} stations={stations} />
          </section>

          <section className="mt-6 lg:hidden">
            <AudioPlayer />
          </section>

          <hr className="my-7 border-white/5 lg:hidden" />

          <Link
            to="/live"
            className="flex items-center gap-4 rounded-card border border-error/20 bg-error/5 p-4 transition-colors hover:bg-error/10 lg:hidden"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-error/15 text-error">
              <RadioIcon size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-display text-base font-semibold text-text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-error" /> Live Radio
              </p>
              <p className="text-xs text-text-secondary">Stations currently available over the Internet — worldwide.</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-text-secondary" />
          </Link>

          {recent.length > 0 && (
            <section className="mt-7 lg:hidden">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                <History size={14} className="text-text-secondary" /> Recently Played
              </h2>
              <StationList stations={recent.slice(0, 5)} />
            </section>
          )}

          {/* Desktop: station-preset strip + frequency dial panel, side by side */}
          <div className="hidden lg:grid lg:grid-cols-[1fr_480px] lg:items-start lg:gap-6">
            <section className="rounded-3xl bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-base font-semibold text-text-primary">
                  Top FM Stations {city ? `in ${city.name}` : ""}
                </h2>
                <Link to="/stations" className="text-xs font-semibold text-accent-secondary hover:text-accent">
                  View All
                </Link>
              </div>

              {!city ? (
                <EmptyState
                  icon={MapPin}
                  title="Set your city"
                  description="Choose a city to see FM stations available near you."
                  action={
                    <button
                      type="button"
                      onClick={() => setShowCitySelector(true)}
                      className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
                    >
                      Select City
                    </button>
                  }
                />
              ) : nearby.length === 0 && !loading ? (
                <EmptyState
                  icon={RadioIcon}
                  title="No stations found"
                  description="We couldn't find an FM station for this location."
                />
              ) : (
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-[124px] w-28 shrink-0 animate-pulseSoft rounded-2xl bg-white/5 sm:w-32" />
                      ))
                    : nearby.map((s) => <StationChip key={s.id} station={s} />)}
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-card p-5">
              <FrequencyDial frequency={dialFrequency} onChange={handleDialChange} stations={stations} />
            </section>
          </div>
        </>
      )}

      {showCitySelector && (
        <CitySelector cities={allCities} onSelect={handleSelectCity} onClose={() => setShowCitySelector(false)} />
      )}
    </div>
  );
}
