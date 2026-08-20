import { useEffect, useState } from "react";
import { Routes, Route, Link, useLocation as useRouterLocation } from "react-router-dom";
import { Radio, MapPin, ChevronDown } from "lucide-react";
import { NavLink } from "react-router-dom";

import Home from "./pages/Home";
import Stations from "./pages/Stations";
import LiveRadio from "./pages/LiveRadio";
import Favorites from "./pages/Favorites";
import Settings from "./pages/Settings";
import MiniPlayer from "./components/MiniPlayer";
import Sidebar from "./components/Sidebar";
import { usePlayerStore } from "./store/playerStore";
import { getSavedCity } from "./hooks/useLocation";
import { NAV_ITEMS } from "./nav";

export default function App() {
  const station = usePlayerStore((s) => s.station);
  const routerLocation = useRouterLocation();
  const [cityName, setCityName] = useState<string | null>(() => getSavedCity()?.name ?? null);

  // The selected city lives in localStorage (read/written independently by
  // Home and Settings), not a global store — refresh the desktop top-bar
  // display whenever the route changes so it stays reasonably current
  // without touching that state-management logic.
  useEffect(() => {
    setCityName(getSavedCity()?.name ?? null);
  }, [routerLocation.pathname]);

  return (
    <div className="relative min-h-screen text-text-primary">
      {/* Fixed cinematic background — the monsoon-evening radio photograph */}
      <div className="app-backdrop" aria-hidden="true">
        <div className="app-backdrop__image" />
        <div className="app-backdrop__vignette" />
        <div className="app-backdrop__grain" />
      </div>

      {/* Desktop top bar */}
      <header className="fixed inset-x-0 top-0 z-30 hidden items-center justify-between px-8 py-5 lg:flex" aria-label="Top">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/15 text-accent-secondary shadow-[0_0_20px_-6px_rgba(242,181,68,0.65)] ring-1 ring-accent-secondary/25">
            <Radio size={19} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-semibold tracking-tight text-accent-secondary [text-shadow:0_1px_10px_rgba(0,0,0,0.5)]">
              Local FM
            </span>
            <span className="block text-xs text-text-secondary">Feel the music of your city</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 rounded-full bg-black/20 p-1.5 backdrop-blur-md" aria-label="Primary">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end, live }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? live
                      ? "text-error"
                      : "border-b-2 border-accent text-accent-secondary"
                    : "text-text-secondary hover:text-text-primary"
                }`
              }
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <Link
          to="/settings"
          className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm text-text-primary transition-colors hover:bg-white/5"
        >
          <MapPin size={15} className="text-accent-secondary" aria-hidden="true" />
          {cityName ?? "Select city"}
          <ChevronDown size={14} className="text-text-secondary" aria-hidden="true" />
        </Link>
      </header>

      <Sidebar />

      <div className="relative z-10 mx-auto w-full max-w-2xl lg:max-w-none">
        <main
          className={`px-4 pt-4 sm:px-6 lg:px-10 lg:pl-28 lg:pt-28 ${
            station ? "pb-[148px] lg:pb-32" : "pb-[88px] lg:pb-8"
          }`}
        >
          <div className="lg:mx-auto lg:max-w-[1440px]">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/stations" element={<Stations />} />
              <Route path="/live" element={<LiveRadio />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Mobile: mini player floats above the bottom nav */}
      {station && (
        <div
          className="fixed inset-x-0 z-40 mx-auto w-full max-w-2xl px-3 lg:hidden"
          style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
        >
          <MiniPlayer />
        </div>
      )}

      {/* Desktop: mini player is the docked full-width bottom bar */}
      {station && (
        <div className="fixed inset-x-0 bottom-0 z-40 hidden lg:block">
          <MiniPlayer />
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-accent-secondary/15 bg-bg-secondary lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-2xl items-stretch justify-around">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end, live }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                  isActive ? (live ? "text-error" : "text-accent") : "text-text-secondary hover:text-text-primary"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
                    {live && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-error" />}
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
