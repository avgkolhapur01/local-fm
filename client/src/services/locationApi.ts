export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ReverseGeocodeResult {
  city: string | null;
  state: string | null;
  country: string | null;
}

/** Wraps navigator.geolocation in a promise with sane timeouts. */
export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported on this device/browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

/**
 * Reverse-geocodes coordinates to a city/state/country using OpenStreetMap's
 * free Nominatim API. No API key required. Swap this out for a paid
 * provider by setting VITE_GEOCODE_API_KEY and updating this function if
 * you need higher rate limits in production.
 */
export async function reverseGeocode({ latitude, longitude }: Coordinates): Promise<ReverseGeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("Reverse geocoding failed");
    const data = await res.json();
    const addr = data?.address ?? {};

    return {
      city: addr.city || addr.town || addr.village || addr.county || null,
      state: addr.state || null,
      country: addr.country || null,
    };
  } catch {
    return { city: null, state: null, country: null };
  }
}
