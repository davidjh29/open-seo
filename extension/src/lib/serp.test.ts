// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import serpHtml from "./fixtures/google-serp.html?raw";
import { findResults } from "./serp";

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("findResults", () => {
  it("finds every organic result on a saved Google page, in order", () => {
    const results = findResults(parse(serpHtml));
    expect(results.map((r) => [r.position, r.domain])).toEqual([
      [1, "homedepot.com"],
      [2, "menards.com"],
      [3, "homeimprovementsupply.com"],
      [4, "lowes.com"],
      [5, "bpi.build"],
      [6, "reddit.com"],
      [7, "windowworld.com"],
    ]);
    expect(results[0]?.title).toBe("Siding");
    expect(results[0]?.url).toBe(
      "https://www.homedepot.com/b/Building-Materials-Siding/N-5yc1vZarip",
    );
  });

  it("skips Google's own links and titles outside the results list", () => {
    const results = findResults(
      parse(`
        <div id="rso">
          <div data-rpos="1"><a href="https://maps.google.com/x"><h3>Map</h3></a></div>
          <div data-rpos="2"><a href="/search?q=more"><h3>More</h3></a></div>
          <div data-rpos="3"><h3>People also ask</h3></div>
        </div>
        <div data-rpos="4"><a href="https://example.com/"><h3>Ad</h3></a></div>
      `),
    );
    expect(results).toEqual([]);
  });
});
