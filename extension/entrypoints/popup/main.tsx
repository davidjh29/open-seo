import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { chromeStore } from "@/src/lib/chrome-store";
import { formatUsd } from "@/src/lib/format";
import { ask } from "@/src/lib/messages";
import type { ToolbarStatus } from "@/src/lib/metrics-service";
import { loadSettings, saveSettings } from "@/src/lib/settings";

function Popup() {
  const [status, setStatus] = useState<ToolbarStatus | null>(null);

  useEffect(() => {
    void ask("status", {}).then(setStatus);
  }, []);

  if (!status) return null;

  async function setEnabled(enabled: boolean) {
    await saveSettings(chromeStore, {
      ...(await loadSettings(chromeStore)),
      enabled,
    });
    setStatus(await ask("status", {}));
  }

  return (
    <>
      <h1>OpenSEO Toolbar</h1>
      <div className="row">
        <label htmlFor="enabled" style={{ margin: 0 }}>
          Show metrics on Google
        </label>
        <input
          id="enabled"
          type="checkbox"
          checked={status.enabled}
          onChange={(event) => void setEnabled(event.target.checked)}
        />
      </div>
      <div className="row">
        <span>Spent today</span>
        <strong>
          {formatUsd(status.spentTodayUsd)} of {formatUsd(status.dailyCapUsd)}
        </strong>
      </div>
      {!status.hasCredentials && (
        <p className="hint">Add your DataForSEO login in settings to start.</p>
      )}
      <p className="hint">Changes apply to your next search.</p>
      <div className="actions">
        <button onClick={() => void browser.runtime.openOptionsPage()}>
          Settings
        </button>
      </div>
    </>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Popup />);
