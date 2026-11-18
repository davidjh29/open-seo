import { browser } from "wxt/browser";
import type { KeyValueStore } from "./types";

/** The extension's local storage; it never leaves this browser profile. */
export const chromeStore: KeyValueStore = {
  async get(key) {
    return (await browser.storage.local.get(key))[key];
  },
  async set(key, value) {
    await browser.storage.local.set({ [key]: value });
  },
  async remove(key) {
    await browser.storage.local.remove(key);
  },
};

/** Removes cached metrics, keeping settings and today's spend. */
export async function clearCachedMetrics(): Promise<void> {
  const keys = Object.keys(await browser.storage.local.get(null));
  await browser.storage.local.remove(
    keys.filter((k) => k.startsWith("cache:")),
  );
}
