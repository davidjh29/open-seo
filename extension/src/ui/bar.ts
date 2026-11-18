import { formatCount, formatUsd } from "@/src/lib/format";
import type { KeywordMetrics, ResultMetrics } from "@/src/lib/types";

const HOST_ATTRIBUTE = "data-openseo-toolbar";

const STYLE = `
  :host { all: initial; display: block; margin: 6px 0 2px; }
  .bar {
    display: flex; flex-wrap: wrap; align-items: center; gap: 2px 14px;
    padding: 4px 10px; border-radius: 6px;
    font: 12px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #3c4043; background: #f1f3f4; border: 1px solid #dadce0;
    width: fit-content; max-width: 100%; box-sizing: border-box;
  }
  .section { display: flex; flex-wrap: wrap; gap: 2px 14px; }
  .section + .section { padding-left: 14px; border-left: 1px solid #dadce0; }
  .group { font-weight: 600; color: #1a5fb4; }
  .label { color: #5f6368; }
  .value { font-weight: 600; font-variant-numeric: tabular-nums; }
  .note { color: #5f6368; }
  @media (prefers-color-scheme: dark) {
    .bar { color: #e8eaed; background: #303134; border-color: #5f6368; }
    .group { color: #8ab4f8; }
    .label, .note { color: #bdc1c6; }
    .section + .section { border-color: #5f6368; }
  }
`;

type Cell = { label: string; value: string } | { group: string };

/** Adds an empty toolbar row to a container, or returns the one already there. */
export function mountBar(container: Element, position: "append" | "prepend") {
  const existing = container.querySelector(`:scope > [${HOST_ATTRIBUTE}]`);
  const host = existing ?? document.createElement("div");
  if (!existing) {
    host.setAttribute(HOST_ATTRIBUTE, "");
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE;
    const bar = document.createElement("div");
    bar.className = "bar";
    root.append(style, bar);
    container[position](host);
  }
  const bar = host.shadowRoot?.querySelector(".bar");

  /** Each section is a titled group of metrics that wraps as a unit. */
  function render(sections: Cell[][]) {
    bar?.replaceChildren(
      ...sections.map((cells) => {
        const section = document.createElement("span");
        section.className = "section";
        for (const cell of cells) {
          const span = document.createElement("span");
          if ("group" in cell) {
            span.className = "group";
            span.textContent = cell.group;
          } else {
            const label = document.createElement("span");
            label.className = "label";
            label.textContent = `${cell.label} `;
            const value = document.createElement("span");
            value.className = "value";
            value.textContent = cell.value;
            span.append(label, value);
          }
          section.append(span);
        }
        return section;
      }),
    );
  }

  return {
    isNew: !existing,
    remove: () => host.remove(),
    showNote(text: string) {
      const note = document.createElement("span");
      note.className = "note";
      note.textContent = text;
      bar?.replaceChildren(note);
    },
    showResult({ domain, page }: ResultMetrics) {
      render([
        [
          { group: "Domain" },
          { label: "Rank", value: formatCount(domain?.authority) },
          {
            label: "Ref. domains",
            value: formatCount(domain?.referringDomains),
          },
          { label: "Backlinks", value: formatCount(domain?.backlinks) },
          { label: "Traffic", value: formatCount(domain?.organicTraffic) },
          { label: "Keywords", value: formatCount(domain?.organicKeywords) },
        ],
        [
          { group: "Page" },
          { label: "Rank", value: formatCount(page?.authority) },
          { label: "Ref. domains", value: formatCount(page?.referringDomains) },
          { label: "Backlinks", value: formatCount(page?.backlinks) },
        ],
      ]);
    },
    showKeyword(keyword: string, metrics: KeywordMetrics | null) {
      if (!metrics) return this.showNote(`No keyword data for “${keyword}”.`);
      render([
        [
          { group: `“${keyword}”` },
          { label: "Volume", value: formatCount(metrics.searchVolume) },
          { label: "Difficulty", value: formatCount(metrics.difficulty) },
          { label: "CPC", value: formatUsd(metrics.cpc) },
          { label: "Intent", value: metrics.intent ?? "–" },
        ],
      ]);
    },
  };
}

export type Bar = ReturnType<typeof mountBar>;
