import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
}

export default function SearchBar({ placeholder = "Search station or frequency", onSearch, debounceMs = 300 }: SearchBarProps) {
  const [value, setValue] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(value), debounceMs);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3.5 shadow-sm transition-shadow duration-200 focus-within:shadow-[0_0_0_1px_rgba(232,117,34,0.55),0_0_24px_-6px_rgba(232,117,34,0.5)]">
      <Search size={18} className="shrink-0 text-accent-secondary" aria-hidden="true" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        inputMode="search"
        className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setValue("")}
          className="shrink-0 text-text-secondary hover:text-text-primary"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
