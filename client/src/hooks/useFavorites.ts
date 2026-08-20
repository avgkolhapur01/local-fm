import { useCallback, useEffect, useState } from "react";
import type { RadioStation } from "../types/radio";

const FAVORITES_KEY = "localfm:favorites";

function readFavorites(): RadioStation[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFavorites(list: RadioStation[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  } catch {
    /* localStorage unavailable — favorites just won't persist */
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<RadioStation[]>(() => readFavorites());

  // Keep in sync across tabs/windows.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === FAVORITES_KEY) setFavorites(readFavorites());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isFavorite = useCallback((id: string) => favorites.some((f) => f.id === id), [favorites]);

  const toggleFavorite = useCallback((station: RadioStation) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === station.id);
      const next = exists ? prev.filter((f) => f.id !== station.id) : [station, ...prev];
      writeFavorites(next);
      return next;
    });
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
