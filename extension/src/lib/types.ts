/** A DataForSEO market: where and in which language metrics are measured. */
export type Locale = { locationCode: number; languageCode: string };

export type DomainMetrics = {
  authority: number | null;
  referringDomains: number | null;
  backlinks: number | null;
  organicTraffic: number | null;
  organicKeywords: number | null;
};

export type PageMetrics = {
  authority: number | null;
  referringDomains: number | null;
  backlinks: number | null;
};

export type KeywordMetrics = {
  searchVolume: number | null;
  difficulty: number | null;
  cpc: number | null;
  intent: string | null;
};

/** What a provider call returned, plus what it cost in US dollars. */
export type Priced<T> = { data: T; cost: number };

export type BulkMetrics = {
  domains: Record<string, DomainMetrics>;
  pages: Record<string, PageMetrics>;
};

/**
 * Where metrics come from. The toolbar only talks to this interface, so the
 * DataForSEO provider can later be swapped for one backed by an OpenSEO server.
 */
export type MetricsProvider = {
  id: string;
  getBulkMetrics(
    targets: { domains: string[]; urls: string[] },
    locale: Locale,
  ): Promise<Priced<BulkMetrics> & { warnings: string[] }>;
  getKeywordOverview(
    keyword: string,
    locale: Locale,
  ): Promise<Priced<KeywordMetrics | null>>;
};

/** What the toolbar shows for one search result. */
export type ResultMetrics = {
  domain: DomainMetrics | null;
  page: PageMetrics | null;
};

/** The slice of chrome.storage.local the toolbar uses; faked in tests. */
export type KeyValueStore = {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
};
