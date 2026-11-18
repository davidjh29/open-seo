import { describe, expect, it, vi } from "vitest";
import { createDataForSeoProvider } from "./dataforseo";

const locale = { locationCode: 2840, languageCode: "en" };
const credentials = { login: "me", password: "secret" };

function ok(items: unknown[], cost: number) {
  return {
    status_code: 20000,
    cost,
    tasks: [{ status_code: 20000, result: [{ items }] }],
  };
}

/** A fetch that answers each DataForSEO path from a table of bodies. */
function fakeFetch(bodies: Record<string, unknown>) {
  return vi.fn(async (url: string | URL | Request) => {
    const path = new URL(String(url)).pathname;
    return new Response(JSON.stringify(bodies[path]), { status: 200 });
  });
}

describe("DataForSEO provider", () => {
  it("merges the four bulk lookups per domain and page and sums their cost", async () => {
    const page = "https://example.com/a";
    const provider = createDataForSeoProvider(
      credentials,
      fakeFetch({
        "/v3/backlinks/bulk_ranks/live": ok(
          [
            { target: "example.com", rank: 71 },
            { target: page, rank: 12 },
          ],
          0.02,
        ),
        "/v3/backlinks/bulk_referring_domains/live": ok(
          [{ target: "example.com", referring_domains: 300 }],
          0.02,
        ),
        "/v3/backlinks/bulk_backlinks/live": ok(
          [{ target: "example.com", backlinks: 9000 }],
          0.02,
        ),
        "/v3/dataforseo_labs/google/bulk_traffic_estimation/live": ok(
          [
            {
              target: "example.com",
              metrics: { organic: { etv: 1234.5, count: 88 } },
            },
          ],
          0.1,
        ),
      }),
    );

    const result = await provider.getBulkMetrics(
      { domains: ["example.com"], urls: [page] },
      locale,
    );

    expect(result.data.domains["example.com"]).toEqual({
      authority: 71,
      referringDomains: 300,
      backlinks: 9000,
      organicTraffic: 1234.5,
      organicKeywords: 88,
    });
    expect(result.data.pages[page]).toEqual({
      authority: 12,
      referringDomains: null,
      backlinks: null,
    });
    expect(result.cost).toBeCloseTo(0.16);
    expect(result.warnings).toEqual([]);
  });

  it("keeps traffic data and warns when the backlink lookups are refused", async () => {
    const refused = {
      status_code: 20000,
      cost: 0,
      tasks: [{ status_code: 40204, status_message: "Access denied." }],
    };
    const provider = createDataForSeoProvider(
      credentials,
      fakeFetch({
        "/v3/backlinks/bulk_ranks/live": refused,
        "/v3/backlinks/bulk_referring_domains/live": refused,
        "/v3/backlinks/bulk_backlinks/live": refused,
        "/v3/dataforseo_labs/google/bulk_traffic_estimation/live": ok(
          [
            {
              target: "example.com",
              metrics: { organic: { etv: 5, count: 1 } },
            },
          ],
          0.1,
        ),
      }),
    );

    const result = await provider.getBulkMetrics(
      { domains: ["example.com"], urls: [] },
      locale,
    );

    expect(result.data.domains["example.com"]?.organicTraffic).toBe(5);
    expect(result.data.domains["example.com"]?.authority).toBeNull();
    expect(result.warnings).toEqual(["DataForSEO: Access denied."]);
  });

  it("reports a rejected login in plain words", async () => {
    const provider = createDataForSeoProvider(
      credentials,
      vi.fn(async () => new Response("{}", { status: 401 })),
    );
    await expect(provider.getKeywordOverview("siding", locale)).rejects.toThrow(
      "DataForSEO rejected the login or password.",
    );
  });

  it("maps a keyword overview", async () => {
    const provider = createDataForSeoProvider(
      credentials,
      fakeFetch({
        "/v3/dataforseo_labs/google/keyword_overview/live": ok(
          [
            {
              keyword_info: { search_volume: 5400, cpc: 7.1 },
              keyword_properties: { keyword_difficulty: 33 },
              search_intent_info: { main_intent: "commercial" },
            },
          ],
          0.0101,
        ),
      }),
    );
    expect(await provider.getKeywordOverview("siding", locale)).toEqual({
      data: {
        searchVolume: 5400,
        cpc: 7.1,
        difficulty: 33,
        intent: "commercial",
      },
      cost: 0.0101,
    });
  });
});
