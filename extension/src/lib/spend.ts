import type { KeyValueStore } from "./types";

export const DEFAULT_DAILY_CAP_USD = 1;
const PREFIX = "spend:";

/** The local calendar day, e.g. "2026-11-18"; spend resets when it changes. */
function dayKey(now: number): string {
  const date = new Date(now);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${PREFIX}${date.getFullYear()}-${month}-${day}`;
}

/** Tracks what the toolbar has spent today, in US dollars. */
export function createSpendTracker(
  store: KeyValueStore,
  now: () => number = Date.now,
) {
  async function today(): Promise<number> {
    const raw = await store.get(dayKey(now()));
    return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
  }
  return {
    today,
    async record(cost: number): Promise<void> {
      if (!Number.isFinite(cost) || cost <= 0) return;
      await store.set(dayKey(now()), (await today()) + cost);
    },
    /** False once today's spend has reached the cap. */
    async underCap(capUsd: number): Promise<boolean> {
      return (await today()) < capUsd;
    },
  };
}

export type SpendTracker = ReturnType<typeof createSpendTracker>;
