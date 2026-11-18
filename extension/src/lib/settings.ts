import { z } from "zod";
import { DEFAULT_DAILY_CAP_USD } from "./spend";
import type { KeyValueStore } from "./types";

const KEY = "settings";

const settingsSchema = z.object({
  enabled: z.boolean().default(true),
  login: z.string().default(""),
  password: z.string().default(""),
  // DataForSEO market; 2840 is the United States.
  locationCode: z.number().int().positive().default(2840),
  languageCode: z.string().min(2).default("en"),
  dailyCapUsd: z.number().nonnegative().default(DEFAULT_DAILY_CAP_USD),
});

export type Settings = z.infer<typeof settingsSchema>;

export async function loadSettings(store: KeyValueStore): Promise<Settings> {
  const parsed = settingsSchema.safeParse((await store.get(KEY)) ?? {});
  return parsed.success ? parsed.data : settingsSchema.parse({});
}

export async function saveSettings(
  store: KeyValueStore,
  settings: Settings,
): Promise<void> {
  await store.set(KEY, settingsSchema.parse(settings));
}
