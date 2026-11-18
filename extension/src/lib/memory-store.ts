import type { KeyValueStore } from "./types";

/** An in-memory KeyValueStore, used by tests. */
export function createMemoryStore(): KeyValueStore {
  const map = new Map<string, unknown>();
  return {
    get: async (key) => map.get(key),
    set: async (key, value) => {
      map.set(key, value);
    },
    remove: async (key) => {
      map.delete(key);
    },
  };
}
