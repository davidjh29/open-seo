import { z } from "zod";
import type {
  BulkMetrics,
  DomainMetrics,
  KeywordMetrics,
  Locale,
  MetricsProvider,
  PageMetrics,
  Priced,
} from "./types";

const API_BASE = "https://api.dataforseo.com";
const OK = 20000;

const envelopeSchema = z.object({
  status_code: z.number(),
  status_message: z.string().nullish(),
  cost: z.number().nullish(),
  tasks: z
    .array(
      z.object({
        status_code: z.number(),
        status_message: z.string().nullish(),
        result: z
          .array(z.object({ items: z.array(z.unknown()).nullish() }))
          .nullish(),
      }),
    )
    .nullish(),
});

const count = z.number().nullish();
const rankItem = z.object({ target: z.string(), rank: count });
const referringDomainsItem = z.object({
  target: z.string(),
  referring_domains: count,
});
const backlinksItem = z.object({ target: z.string(), backlinks: count });
const trafficItem = z.object({
  target: z.string(),
  metrics: z
    .object({ organic: z.object({ etv: count, count }).nullish() })
    .nullish(),
});
const keywordItem = z.object({
  keyword_info: z.object({ search_volume: count, cpc: count }).nullish(),
  keyword_properties: z.object({ keyword_difficulty: count }).nullish(),
  search_intent_info: z.object({ main_intent: z.string().nullish() }).nullish(),
});

/** Items that fail their schema are dropped rather than failing the call. */
function parseItems<T>(items: unknown[], schema: z.ZodType<T>): T[] {
  return items.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Targets come back with or without a trailing slash; match on neither. */
function targetKey(target: string): string {
  return target.toLowerCase().replace(/\/$/, "");
}

function byTarget<T extends { target: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [targetKey(item.target), item]));
}

/** Metrics straight from DataForSEO, billed to the user's own account. */
export function createDataForSeoProvider(
  credentials: { login: string; password: string },
  fetchFn: typeof fetch = fetch,
): MetricsProvider {
  const authorization = `Basic ${btoa(`${credentials.login}:${credentials.password}`)}`;

  async function post(path: string, task: object): Promise<Priced<unknown[]>> {
    const response = await fetchFn(API_BASE + path, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([task]),
    });
    if (response.status === 401) {
      throw new Error("DataForSEO rejected the login or password.");
    }
    const envelope = envelopeSchema.parse(await response.json());
    const task0 = envelope.tasks?.[0];
    if (envelope.status_code !== OK || !task0 || task0.status_code !== OK) {
      const message = task0?.status_message ?? envelope.status_message;
      throw new Error(`DataForSEO: ${message ?? "request failed"}`);
    }
    return {
      data: task0.result?.[0]?.items ?? [],
      cost: envelope.cost ?? 0,
    };
  }

  return {
    id: "dataforseo",

    async getBulkMetrics(targets, locale: Locale) {
      const all = [...targets.domains, ...targets.urls];
      const backlinkTask = { targets: all, rank_scale: "one_hundred" };
      const calls = await Promise.allSettled([
        post("/v3/backlinks/bulk_ranks/live", backlinkTask),
        post("/v3/backlinks/bulk_referring_domains/live", backlinkTask),
        post("/v3/backlinks/bulk_backlinks/live", backlinkTask),
        targets.domains.length > 0
          ? post("/v3/dataforseo_labs/google/bulk_traffic_estimation/live", {
              targets: targets.domains,
              location_code: locale.locationCode,
              language_code: locale.languageCode,
              item_types: ["organic"],
            })
          : Promise.resolve({ data: [], cost: 0 }),
      ]);

      const warnings: string[] = [];
      let cost = 0;
      const items = calls.map((call) => {
        if (call.status === "fulfilled") {
          cost += call.value.cost;
          return call.value.data;
        }
        warnings.push(
          call.reason instanceof Error ? call.reason.message : "request failed",
        );
        return [];
      });
      if (warnings.length === calls.length) throw new Error(warnings[0]);

      const ranks = byTarget(parseItems(items[0] ?? [], rankItem));
      const refDomains = byTarget(
        parseItems(items[1] ?? [], referringDomainsItem),
      );
      const backlinks = byTarget(parseItems(items[2] ?? [], backlinksItem));
      const traffic = byTarget(parseItems(items[3] ?? [], trafficItem));

      const linkMetrics = (target: string): PageMetrics => ({
        authority: ranks.get(targetKey(target))?.rank ?? null,
        referringDomains:
          refDomains.get(targetKey(target))?.referring_domains ?? null,
        backlinks: backlinks.get(targetKey(target))?.backlinks ?? null,
      });

      const data: BulkMetrics = { domains: {}, pages: {} };
      for (const domain of targets.domains) {
        const organic = traffic.get(targetKey(domain))?.metrics?.organic;
        const metrics: DomainMetrics = {
          ...linkMetrics(domain),
          organicTraffic: organic?.etv ?? null,
          organicKeywords: organic?.count ?? null,
        };
        data.domains[domain] = metrics;
      }
      for (const url of targets.urls) data.pages[url] = linkMetrics(url);

      return { data, cost, warnings: [...new Set(warnings)] };
    },

    async getKeywordOverview(keyword, locale) {
      const { data, cost } = await post(
        "/v3/dataforseo_labs/google/keyword_overview/live",
        {
          keywords: [keyword],
          location_code: locale.locationCode,
          language_code: locale.languageCode,
        },
      );
      const item = parseItems(data, keywordItem)[0];
      const metrics: KeywordMetrics | null = item
        ? {
            searchVolume: item.keyword_info?.search_volume ?? null,
            cpc: item.keyword_info?.cpc ?? null,
            difficulty: item.keyword_properties?.keyword_difficulty ?? null,
            intent: item.search_intent_info?.main_intent ?? null,
          }
        : null;
      return { data: metrics, cost };
    },
  };
}
