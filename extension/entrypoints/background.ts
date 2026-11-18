import { chromeStore } from "@/src/lib/chrome-store";
import { createDataForSeoProvider } from "@/src/lib/dataforseo";
import type { Message } from "@/src/lib/messages";
import { createMetricsService } from "@/src/lib/metrics-service";

export default defineBackground(() => {
  const service = createMetricsService({
    store: chromeStore,
    createProvider: (settings) => createDataForSeoProvider(settings),
  });

  function answer(message: Message) {
    switch (message.type) {
      case "serp-metrics":
        return service.getSerpMetrics(message.targets);
      case "keyword":
        return service.getKeyword(message.keyword);
      case "status":
        return service.getStatus();
    }
  }

  // Only this extension's own pages and content script can send messages
  // here; the manifest declares no externally_connectable origins.
  browser.runtime.onMessage.addListener(
    (message: Message, _sender, sendResponse) => {
      void answer(message).then(sendResponse);
      return true;
    },
  );
});
