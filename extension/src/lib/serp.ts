import { domainOf, pageOf } from "./targets";

export type SerpResult = {
  position: number;
  url: string;
  domain: string;
  title: string;
  /** The result's block on the page; the metrics bar is appended to it. */
  container: Element;
};

/**
 * The organic results on a Google results page, in page order.
 *
 * This is the only place that knows Google's markup. An organic result is a
 * link with an <h3> title inside #rso that points off Google. Its block is the
 * nearest ancestor carrying Google's result-position attribute.
 */
export function findResults(doc: Document): SerpResult[] {
  const results: SerpResult[] = [];
  const seen = new Set<Element>();
  for (const heading of doc.querySelectorAll("#rso a[href] h3")) {
    const anchor = heading.closest("a");
    const href = anchor?.getAttribute("href");
    if (!anchor || !href) continue;
    const url = pageOf(href);
    const domain = domainOf(href);
    if (!url || !domain || /(^|\.)google\.[a-z.]+$/.test(domain)) continue;
    const container =
      anchor.closest("[data-rpos]") ?? anchor.closest("[data-hveid]");
    if (!container || seen.has(container)) continue;
    seen.add(container);
    results.push({
      position: results.length + 1,
      url,
      domain,
      title: heading.textContent.trim(),
      container,
    });
  }
  return results;
}
