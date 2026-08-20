import { useCallback, useState } from "react";
import { getCurrentPosition, reverseGeocode } from "../services/locationApi";
import { radioApi } from "../services/radioApi";
import type { City } from "../types/radio";

type DetectStatus = "idle" | "detecting" | "success" | "denied" | "error";

const SAVED_CITY_KEY = "localfm:selected-city";

export function useLocation() {
  const [status, setStatus] = useState<DetectStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const detectLocation = useCallback(async (): Promise<City | null> => {
    setStatus("detecting");
    setErrorMessage(null);

    try {
      const coords = await getCurrentPosition();
      const geo = await reverseGeocode(coords);

      // Prefer matching to a city we actually have stations for.
      const nearest = await radioApi.getNearestCity(coords.latitude, coords.longitude);
      const resolved: City | null =
        nearest ??
        (geo.city ? { id: geo.city.toLowerCase(), name: geo.city, state: geo.state ?? undefined, country: geo.country ?? "India" } : null);

      if (resolved) {
        setStatus("success");
        saveSelectedCity(resolved);
        return resolved;
      }

      setStatus("error");
      setErrorMessage("Location unavailable. Please select your city manually.");
      return null;
    } catch (err: any) {
      // GeolocationPositionError.code === 1 means permission denied.
      if (err?.code === 1) {
        setStatus("denied");
        setErrorMessage("Location permission denied. Please select your city manually.");
      } else {
        setStatus("error");
        setErrorMessage("Location unavailable. Please select your city manually.");
      }
      return null;
    }
  }, []);

  return { status, errorMessage, detectLocation };
}

export function saveSelectedCity(city: City) {
  try {
    localStorage.setItem(SAVED_CITY_KEY, JSON.stringify(city));
  } catch {
    /* ignore */
  }
}

export function getSavedCity(): City | null {
  try {
    const raw = localStorage.getItem(SAVED_CITY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
