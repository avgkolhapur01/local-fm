import { Link } from "react-router-dom";
import { Radio, Settings, MapPin } from "lucide-react";
import type { City } from "../types/radio";

interface HeaderProps {
  city: City | null;
  onChangeCity: () => void;
}

export default function Header({ city, onChangeCity }: HeaderProps) {
  return (
    <header className="flex items-center justify-between pt-1">
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/15 text-accent-secondary shadow-[0_0_20px_-6px_rgba(242,181,68,0.65)] ring-1 ring-accent-secondary/25">
          <Radio size={19} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <span className="font-display text-lg font-semibold tracking-tight text-text-primary [text-shadow:0_1px_10px_rgba(0,0,0,0.5)]">
          Local FM
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onChangeCity}
          className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <MapPin size={15} className="text-accent-secondary" aria-hidden="true" />
          <span className="max-w-[9rem] truncate">{city?.name ?? "Select city"}</span>
        </button>

        <Link
          to="/settings"
          aria-label="Settings"
          className="grid h-9 w-9 place-items-center rounded-full bg-card text-text-secondary transition-colors hover:text-text-primary"
        >
          <Settings size={18} aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
