import { describe, expect, it } from "vitest";
import { domainOf, pageOf } from "./targets";

describe("domainOf", () => {
  it("lowercases the host and drops www", () => {
    expect(domainOf("https://WWW.Example.com/a?b=1")).toBe("example.com");
  });
  it("keeps other subdomains", () => {
    expect(domainOf("https://blog.example.com/")).toBe("blog.example.com");
  });
  it("rejects non-web and malformed URLs", () => {
    expect(domainOf("javascript:void(0)")).toBeNull();
    expect(domainOf("not a url")).toBeNull();
  });
});

describe("pageOf", () => {
  it("drops the fragment and keeps the query", () => {
    expect(pageOf("https://example.com/a?b=1#top")).toBe(
      "https://example.com/a?b=1",
    );
  });
  it("rejects non-web URLs", () => {
    expect(pageOf("chrome://settings")).toBeNull();
  });
});
