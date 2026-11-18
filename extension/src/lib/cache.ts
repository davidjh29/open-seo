import type { KeyValueStore } from "./types";

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PREFIX = "cache:";

type Entry = { value: unknown; storedAt: number };

function isEntry(raw: unknown): raw is Entry {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "value" in raw &&
    "storedAt" in raw &&
    typeof raw.storedAt === "number"
  );
}

/** A 24-hour cache over a key-value store. Expired entries read as missing. */
export function createCache(
  store: KeyValueStore,
  now: () => number = Date.now,
) {
  return {
    async get(key: string): Promise<unknown> {
      const raw = await store.get(PREFIX + key);
      if (!isEntry(raw)) return undefined;
      if (now() - raw.storedAt >= CACHE_TTL_MS) {
        await store.remove(PREFIX + key);
        return undefined;
      }
      return raw.value;
    },
    async set(key: string, value: unknown): Promise<void> {
      await store.set(PREFIX + key, { value, storedAt: now() });
    },
  };
}

export type Cache = ReturnType<typeof createCache>;
