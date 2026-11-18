import { ask } from "@/src/lib/messages";
import type { Unavailable } from "@/src/lib/metrics-service";
import { findResults } from "@/src/lib/serp";
import { mountBar, type Bar } from "@/src/ui/bar";

const NOTES: Record<Exclude<Unavailable["status"], "off" | "error">, string> = {
  "no-credentials":
    "OpenSEO Toolbar: add your DataForSEO login in the extension settings.",
  "cap-reached":
    "OpenSEO Toolbar: daily spend cap reached. Raise it in the extension settings.",
};

/** Shows why there are no metrics, or removes the bars when switched off. */
function showUnavailable(bars: Bar[], reply: Unavailable) {
  for (const bar of bars) {
    if (reply.status === "off") bar.remove();
    else if (reply.status === "error") {
      bar.showNote(`OpenSEO Toolbar: ${reply.message}`);
    } else bar.showNote(NOTES[reply.status]);
  }
}

async function loadKeywordBar() {
  const keyword = new URLSearchParams(location.search).get("q")?.trim();
  const list = document.querySelector("#rso");
  if (!keyword || !list) return;
  const bar = mountBar(list, "prepend");
  if (!bar.isNew) return;
  bar.showNote("Loading keyword data…");
  const reply = await ask("keyword", { keyword });
  if (reply.status === "ok") bar.showKeyword(keyword, reply.metrics);
  else showUnavailable([bar], reply);
}

/** Adds a bar to every result that does not have one yet, then fills them. */
async function loadResultBars() {
  const fresh = findResults(document).flatMap((result) => {
    const bar = mountBar(result.container, "append");
    return bar.isNew ? [{ result, bar }] : [];
  });
  if (fresh.length === 0) return;
  for (const { bar } of fresh) bar.showNote("Loading metrics…");

  const reply = await ask("serp-metrics", {
    targets: fresh.map(({ result }) => ({
      url: result.url,
      domain: result.domain,
    })),
  });
  if (reply.status !== "ok") {
    return showUnavailable(
      fresh.map(({ bar }) => bar),
      reply,
    );
  }
  for (const { result, bar } of fresh) {
    const metrics = reply.byUrl[result.url];
    if (metrics) bar.showResult(metrics);
    else bar.remove();
  }
}

export default defineContentScript({
  matches: ["https://www.google.com/search*"],
  async main() {
    // Ask once up front so a switched-off toolbar adds nothing to the page.
    const status = await ask("status", {});
    if (!status.enabled) return;

    void loadKeywordBar();
    void loadResultBars();

    // Google adds results as you scroll; pick those up, at most twice a second.
    let scheduled = false;
    new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        void loadResultBars();
      }, 500);
    }).observe(document.body, { childList: true, subtree: true });
  },
});
