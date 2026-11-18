import { browser } from "wxt/browser";
import type {
  KeywordReply,
  SerpMetricsReply,
  ToolbarStatus,
} from "./metrics-service";

/** What pages ask the background worker, and what it answers. */
export type Requests = {
  "serp-metrics": {
    request: { targets: { url: string; domain: string }[] };
    reply: SerpMetricsReply;
  };
  keyword: { request: { keyword: string }; reply: KeywordReply };
  status: { request: object; reply: ToolbarStatus };
};

export type Message = {
  [K in keyof Requests]: { type: K } & Requests[K]["request"];
}[keyof Requests];

export function ask<K extends keyof Requests>(
  type: K,
  request: Requests[K]["request"],
): Promise<Requests[K]["reply"]> {
  return browser.runtime.sendMessage({ type, ...request });
}
