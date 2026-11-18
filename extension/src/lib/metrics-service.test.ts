import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStore } from "./memory-store";
import { createMetricsService } from "./metrics-service";
import { loadSettings, saveSettings } from "./settings";
import type { KeyValueStore, MetricsProvider } from "./types";

const target = { url: "https://example.com/a", domain: "example.com" };
const domainMetrics = {
  authority: 50,
  referringDomains: 10,
  backlinks: 20,
  organicTraffic: 30,
  organicKeywords: 40,
};
const pageMetrics = { authority: 5, referringDomains: 1, backlinks: 2 };

const provider = {
  id: "fake",
  getBulkMetrics: vi.fn<MetricsProvider["getBulkMetrics"]>(),
  getKeywordOverview: vi.fn<MetricsProvider["getKeywordOverview"]>(),
};

let store: KeyValueStore;

async function setup(overrides: object = {}) {
  store = createMemoryStore();
  await saveSettings(store, {
    ...(await loadSettings(store)),
    login: "me",
    password: "secret",
    ...overrides,
  });
  return createMetricsService({ store, createProvider: () => provider });
}

beforeEach(() => {
  provider.getBulkMetrics.mockResolvedValue({
    data: {
      domains: { "example.com": domainMetrics },
      pages: { "https://example.com/a": pageMetrics },
    },
    cost: 0.16,
    warnings: [],
  });
  provider.getKeywordOverview.mockResolvedValue({ data: null, cost: 0.01 });
});

describe("metrics service", () => {
  it("returns domain and page metrics for each result", async () => {
    const service = await setup();
    expect(await service.getSerpMetrics([target])).toEqual({
      status: "ok",
      byUrl: {
        "https://example.com/a": { domain: domainMetrics, page: pageMetrics },
      },
      warnings: [],
    });
  });

  it("answers a repeat search from the cache at no cost", async () => {
    const service = await setup();
    await service.getSerpMetrics([target]);
    const second = await service.getSerpMetrics([target]);
    expect(second.status).toBe("ok");
    expect(provider.getBulkMetrics).toHaveBeenCalledTimes(1);
    expect((await service.getStatus()).spentTodayUsd).toBeCloseTo(0.16);
  });

  it("only asks the provider for what is not cached", async () => {
    const service = await setup();
    await service.getSerpMetrics([target]);
    await service.getSerpMetrics([
      target,
      { url: "https://example.com/b", domain: "example.com" },
    ]);
    expect(provider.getBulkMetrics).toHaveBeenLastCalledWith(
      { domains: [], urls: ["https://example.com/b"] },
      { locationCode: 2840, languageCode: "en" },
    );
  });

  it("does not cache a partial answer", async () => {
    provider.getBulkMetrics.mockResolvedValueOnce({
      data: { domains: {}, pages: {} },
      cost: 0.1,
      warnings: ["DataForSEO: Access denied."],
    });
    const service = await setup();
    await service.getSerpMetrics([target]);
    await service.getSerpMetrics([target]);
    expect(provider.getBulkMetrics).toHaveBeenCalledTimes(2);
  });

  it("makes no calls while switched off", async () => {
    const service = await setup({ enabled: false });
    expect(await service.getSerpMetrics([target])).toEqual({ status: "off" });
    expect(await service.getKeyword("siding")).toEqual({ status: "off" });
    expect(provider.getBulkMetrics).not.toHaveBeenCalled();
  });

  it("asks for credentials before calling anything", async () => {
    const service = await setup({ password: "" });
    expect(await service.getSerpMetrics([target])).toEqual({
      status: "no-credentials",
    });
    expect(provider.getBulkMetrics).not.toHaveBeenCalled();
  });

  it("stops fetching once the daily cap is reached", async () => {
    const service = await setup({ dailyCapUsd: 0.1 });
    await service.getSerpMetrics([target]);
    const next = await service.getSerpMetrics([
      { url: "https://other.com/", domain: "other.com" },
    ]);
    expect(next).toEqual({ status: "cap-reached" });
    expect(await service.getKeyword("siding")).toEqual({
      status: "cap-reached",
    });
    expect(provider.getBulkMetrics).toHaveBeenCalledTimes(1);
  });

  it("reports a provider failure without charging", async () => {
    provider.getBulkMetrics.mockRejectedValueOnce(new Error("boom"));
    const service = await setup();
    expect(await service.getSerpMetrics([target])).toEqual({
      status: "error",
      message: "boom",
    });
    expect((await service.getStatus()).spentTodayUsd).toBe(0);
  });
});
