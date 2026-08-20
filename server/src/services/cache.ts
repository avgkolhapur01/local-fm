/**
 * A tiny in-memory TTL cache. Used to avoid calling the external radio
 * directory API (or re-probing a stream) on every single UI interaction
 * — see the "CACHING" requirement in the project brief.
 *
 * This is process-local and resets on server restart, which is fine for
 * a single-instance dev/small deployment; swap for Redis if you scale to
 * multiple server instances.
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = await fetcher();
  cacheSet(key, value, ttlMs);
  return value;
}
