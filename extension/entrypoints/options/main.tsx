import { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { chromeStore, clearCachedMetrics } from "@/src/lib/chrome-store";
import { loadSettings, saveSettings, type Settings } from "@/src/lib/settings";

function Options() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void loadSettings(chromeStore).then(setSettings);
  }, []);

  if (!settings) return null;

  function update(change: Partial<Settings>) {
    setSettings((current) => (current ? { ...current, ...change } : current));
    setNotice("");
  }

  async function save(event: FormEvent, current: Settings) {
    event.preventDefault();
    try {
      await saveSettings(chromeStore, {
        ...current,
        login: current.login.trim(),
        languageCode: current.languageCode.trim().toLowerCase(),
      });
      setNotice("Saved.");
    } catch {
      setNotice("Check the country code, language code and cap.");
    }
  }

  return (
    <form onSubmit={(event) => void save(event, settings)}>
      <h1>OpenSEO Toolbar settings</h1>

      <label htmlFor="login">DataForSEO API login</label>
      <input
        id="login"
        type="text"
        autoComplete="off"
        value={settings.login}
        onChange={(event) => update({ login: event.target.value })}
      />

      <label htmlFor="password">DataForSEO API password</label>
      <input
        id="password"
        type="password"
        autoComplete="off"
        value={settings.password}
        onChange={(event) => update({ password: event.target.value })}
      />
      <p className="hint">
        Found in your DataForSEO dashboard under API Access. Stored only in this
        browser and sent only to api.dataforseo.com.
      </p>

      <label htmlFor="location">Country (DataForSEO location code)</label>
      <input
        id="location"
        type="number"
        min={1}
        value={settings.locationCode}
        onChange={(event) =>
          update({ locationCode: event.target.valueAsNumber })
        }
      />
      <p className="hint">
        2840 is the United States, 2826 the United Kingdom.
      </p>

      <label htmlFor="language">Language code</label>
      <input
        id="language"
        type="text"
        value={settings.languageCode}
        onChange={(event) => update({ languageCode: event.target.value })}
      />

      <label htmlFor="cap">Daily spend cap (US dollars)</label>
      <input
        id="cap"
        type="number"
        min={0}
        step={0.01}
        value={settings.dailyCapUsd}
        onChange={(event) =>
          update({ dailyCapUsd: event.target.valueAsNumber })
        }
      />
      <p className="hint">
        The toolbar stops fetching new data once today's spend reaches this.
      </p>

      <div className="actions">
        <button type="submit">Save</button>
        <button
          type="button"
          onClick={() =>
            void clearCachedMetrics().then(() => setNotice("Cache cleared."))
          }
        >
          Clear cached metrics
        </button>
        <span role="status">{notice}</span>
      </div>
    </form>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Options />);
