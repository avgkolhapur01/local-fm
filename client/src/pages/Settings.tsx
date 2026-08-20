import { useEffect, useState, type ReactNode } from "react";
import { MapPin, Moon, Sun, Laptop, Info, Radio, Bug } from "lucide-react";
import CitySelector from "../components/CitySelector";
import DebugPanel from "../components/DebugPanel";
import { radioApi } from "../services/radioApi";
import { getSavedCity, saveSelectedCity } from "../hooks/useLocation";
import type { City } from "../types/radio";

type Appearance = "dark" | "light" | "system";
type Quality = "auto" | "low" | "high";

const SETTINGS_KEY = "localfm:settings";

interface StoredSettings {
  appearance: Appearance;
  volumeNormalization: boolean;
  autoplay: boolean;
  audioQuality: Quality;
}

const DEFAULT_SETTINGS: StoredSettings = {
  appearance: "dark",
  volumeNormalization: false,
  autoplay: true,
  audioQuality: "auto",
};

function readSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(s: StoredSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">{title}</h2>
      <div className="divide-y divide-white/5 rounded-card bg-card">{children}</div>
    </div>
  );
}

function Row({ label, value, onClick }: { label: string; value?: ReactNode; onClick?: () => void }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`flex w-full items-center justify-between px-4 py-3.5 text-left text-sm ${
        onClick ? "hover:bg-white/5" : ""
      }`}
    >
      <span className="text-text-primary">{label}</span>
      {value}
    </Comp>
  );
}

export default function Settings() {
  const [city, setCity] = useState<City | null>(() => getSavedCity());
  const [allCities, setAllCities] = useState<City[]>([]);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [settings, setSettings] = useState<StoredSettings>(() => readSettings());
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    radioApi.getCities().then(setAllCities);
  }, []);

  useEffect(() => {
    writeSettings(settings);
  }, [settings]);

  const update = <K extends keyof StoredSettings>(key: K, value: StoredSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="pb-4">
      <h1 className="font-display text-2xl font-bold text-text-primary">Settings</h1>
      <p className="text-sm text-text-secondary">Manage your Local FM experience</p>

      <SectionCard title="Location">
        <Row
          label="City"
          onClick={() => setShowCitySelector(true)}
          value={
            <span className="flex items-center gap-1 text-text-secondary">
              <MapPin size={13} className="text-accent" /> {city?.name ?? "Not set"}
            </span>
          }
        />
      </SectionCard>

      <SectionCard title="Appearance">
        <div className="flex items-center gap-2 px-4 py-3.5">
          {(
            [
              { key: "dark", label: "Dark", icon: Moon },
              { key: "light", label: "Light", icon: Sun },
              { key: "system", label: "System", icon: Laptop },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => update("appearance", key)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-medium transition-colors ${
                settings.appearance === key ? "bg-accent/15 text-accent" : "bg-bg-secondary text-text-secondary"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <p className="px-4 pb-3.5 text-xs text-text-secondary">
          Local FM is designed dark-first. Light mode is a lighter accent treatment; full light theming is on the
          roadmap.
        </p>
      </SectionCard>

      <SectionCard title="Audio">
        <Row
          label="Volume normalization"
          value={
            <input
              type="checkbox"
              checked={settings.volumeNormalization}
              onChange={(e) => update("volumeNormalization", e.target.checked)}
              className="h-5 w-5 accent-accent"
              aria-label="Toggle volume normalization"
            />
          }
        />
        <Row
          label="Autoplay on select"
          value={
            <input
              type="checkbox"
              checked={settings.autoplay}
              onChange={(e) => update("autoplay", e.target.checked)}
              className="h-5 w-5 accent-accent"
              aria-label="Toggle autoplay"
            />
          }
        />
      </SectionCard>

      <SectionCard title="Data">
        <div className="px-4 py-3.5">
          <label htmlFor="audio-quality" className="mb-2 block text-sm text-text-primary">
            Audio quality
          </label>
          <select
            id="audio-quality"
            value={settings.audioQuality}
            onChange={(e) => update("audioQuality", e.target.value as Quality)}
            className="w-full rounded-xl bg-bg-secondary px-3 py-2.5 text-sm text-text-primary focus:outline-none"
          >
            <option value="auto">Auto (recommended)</option>
            <option value="low">Low — save data</option>
            <option value="high">High — best quality</option>
          </select>
          <p className="mt-2 text-xs text-text-secondary">
            Actual quality depends on what each broadcaster's stream provides; this only expresses your preference.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="About">
        <Row label="Local FM" value={<span className="text-text-secondary">Internet radio directory</span>} />
        <Row label="Version" value={<span className="text-text-secondary">1.0.0</span>} />
      </SectionCard>

      <SectionCard title="Developer">
        <Row
          label="Audio debug panel"
          onClick={() => setShowDebug((v) => !v)}
          value={
            <span className="flex items-center gap-1 text-text-secondary">
              <Bug size={13} className="text-accent" /> {showDebug ? "Hide" : "Show"}
            </span>
          }
        />
      </SectionCard>

      {showDebug && (
        <div className="mt-3">
          <DebugPanel />
        </div>
      )}

      <div className="mt-5 rounded-card bg-card p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          <Info size={13} /> Disclaimer
        </p>
        <p className="text-sm leading-relaxed text-text-secondary">
          Local FM is an Internet radio directory. The application does not receive FM radio signals. Radio streams
          are provided by their respective broadcasters. Local FM does not claim ownership of third-party station
          content.
        </p>
        <p className="mt-2 flex items-start gap-1.5 text-xs text-text-secondary">
          <Radio size={13} className="mt-0.5 shrink-0 text-accent" />
          Stations marked "Demo stream" use a placeholder Internet feed for development and are not yet connected to
          that broadcaster's real, verified stream.
        </p>
        <p className="mt-2 text-xs text-text-secondary">
          Live Radio station data is provided by the{" "}
          <a href="https://www.radio-browser.info" target="_blank" rel="noreferrer" className="underline">
            Radio Browser
          </a>{" "}
          community directory.
        </p>
      </div>

      {showCitySelector && (
        <CitySelector
          cities={allCities}
          onSelect={(c) => {
            setCity(c);
            saveSelectedCity(c);
            setShowCitySelector(false);
          }}
          onClose={() => setShowCitySelector(false)}
        />
      )}
    </div>
  );
}
