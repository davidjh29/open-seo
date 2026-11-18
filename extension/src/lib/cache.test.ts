import { describe, expect, it } from "vitest";
import { CACHE_TTL_MS, createCache } from "./cache";
import { createMemoryStore } from "./memory-store";

describe("cache", () => {
  it("returns what was stored", async () => {
    const cache = createCache(createMemoryStore(), () => 1000);
    await cache.set("a", { n: 1 });
    expect(await cache.get("a")).toEqual({ n: 1 });
  });

  it("reads a missing key as undefined", async () => {
    const cache = createCache(createMemoryStore());
    expect(await cache.get("nope")).toBeUndefined();
  });

  it("expires entries after 24 hours", async () => {
    let time = 0;
    const cache = createCache(createMemoryStore(), () => time);
    await cache.set("a", 1);
    time = CACHE_TTL_MS - 1;
    expect(await cache.get("a")).toBe(1);
    time = CACHE_TTL_MS;
    expect(await cache.get("a")).toBeUndefined();
  });

  it("caches null values, so a known-empty domain is not refetched", async () => {
    const cache = createCache(createMemoryStore());
    await cache.set("a", null);
    expect(await cache.get("a")).toBeNull();
  });
});
