import { createCache } from "./cache";
import { loadSettings, type Settings } from "./settings";
import { createSpendTracker } from "./spend";
import type {
  DomainMetrics,
  KeyValueStore,
  KeywordMetrics,
  MetricsProvider,
  PageMetrics,
  ResultMetrics,
} from "./types";

/** Why the toolbar has nothing to show, when it doesn't. */
export type Unavailable =
  | { status: "off" }
  | { status: "no-credentials" }
  | { status: "cap-reached" }
  | { status: "error"; message: string };

export type SerpMetricsReply =
  | { status: "ok"; byUrl: Record<string, ResultMetrics>; warnings: string[] }
  | Unavailable;

export type KeywordReply =
  { status: "ok"; metrics: KeywordMetrics | null } | Unavailable;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/**
 * Answers the toolbar's questions: cache first, then the provider, never past
 * the daily cap, and never when switched off.
 */
export function createMetricsService(deps: {
  store: KeyValueStore;
  createProvider: (settings: Settings) => MetricsProvider;
  now?: () => number;
}) {
  const cache = createCache(deps.store, deps.now);
  const spend = createSpendTracker(deps.store, deps.now);

  /** The settings and provider, or the reason nothing can be fetched. */
  async function ready(): Promise<
    | { settings: Settings; provider: MetricsProvider; prefix: string }
    | Unavailable
  > {
    const settings = await loadSettings(deps.store);
    if (!settings.enabled) return { status: "off" };
    if (!settings.login || !settings.password) {
      return { status: "no-credentials" };
    }
    const provider = deps.createProvider(settings);
    const prefix = `${provider.id}:${settings.locationCode}:${settings.languageCode}:`;
    return { settings, provider, prefix };
  }

  return {
    async getSerpMetrics(
      targets: { url: string; domain: string }[],
    ): Promise<SerpMetricsReply> {
      const state = await ready();
      if ("status" in state) return state;
      const { settings, provider, prefix } = state;

      const domains = new Map<string, DomainMetrics | null | undefined>();
      const pages = new Map<string, PageMetrics | null | undefined>();
      for (const { url, domain } of targets) {
        // Cached values were written below from provider data.
        domains.set(
          domain,
          (await cache.get(`${prefix}d:${domain}`)) as
            DomainMetrics | undefined,
        );
        pages.set(
          url,
          (await cache.get(`${prefix}p:${url}`)) as PageMetrics | undefined,
        );
      }
      const missing = {
        domains: [...domains]
          .filter(([, v]) => v === undefined)
          .map(([k]) => k),
        urls: [...pages].filter(([, v]) => v === undefined).map(([k]) => k),
      };

      let warnings: string[] = [];
      if (missing.domains.length > 0 || missing.urls.length > 0) {
        if (!(await spend.underCap(settings.dailyCapUsd))) {
          return { status: "cap-reached" };
        }
        try {
          const fetched = await provider.getBulkMetrics(missing, {
            locationCode: settings.locationCode,
            languageCode: settings.languageCode,
          });
          await spend.record(fetched.cost);
          warnings = fetched.warnings;
          // A partial answer is shown but not cached, so it is retried.
          const complete = warnings.length === 0;
          for (const domain of missing.domains) {
            const metrics = fetched.data.domains[domain] ?? null;
            domains.set(domain, metrics);
            if (complete) await cache.set(`${prefix}d:${domain}`, metrics);
          }
          for (const url of missing.urls) {
            const metrics = fetched.data.pages[url] ?? null;
            pages.set(url, metrics);
            if (complete) await cache.set(`${prefix}p:${url}`, metrics);
          }
        } catch (error) {
          return { status: "error", message: errorMessage(error) };
        }
      }

      const byUrl: Record<string, ResultMetrics> = {};
      for (const { url, domain } of targets) {
        byUrl[url] = {
          domain: domains.get(domain) ?? null,
          page: pages.get(url) ?? null,
        };
      }
      return { status: "ok", byUrl, warnings };
    },

    async getKeyword(keyword: string): Promise<KeywordReply> {
      const state = await ready();
      if ("status" in state) return state;
      const { settings, provider, prefix } = state;

      const key = `${prefix}k:${keyword.trim().toLowerCase()}`;
      const cached = await cache.get(key);
      if (cached !== undefined) {
        return { status: "ok", metrics: cached as KeywordMetrics | null };
      }
      if (!(await spend.underCap(settings.dailyCapUsd))) {
        return { status: "cap-reached" };
      }
      try {
        const { data, cost } = await provider.getKeywordOverview(keyword, {
          locationCode: settings.locationCode,
          languageCode: settings.languageCode,
        });
        await spend.record(cost);
        await cache.set(key, data);
        return { status: "ok", metrics: data };
      } catch (error) {
        return { status: "error", message: errorMessage(error) };
      }
    },

    /** What the popup shows: the switch, today's spend and the cap. */
    async getStatus() {
      const settings = await loadSettings(deps.store);
      return {
        enabled: settings.enabled,
        hasCredentials: Boolean(settings.login && settings.password),
        spentTodayUsd: await spend.today(),
        dailyCapUsd: settings.dailyCapUsd,
      };
    },
  };
}

export type ToolbarStatus = Awaited<
  ReturnType<ReturnType<typeof createMetricsService>["getStatus"]>
>;
