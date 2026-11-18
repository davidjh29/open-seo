# OpenSEO Toolbar (Chrome extension)

Shows SEO metrics under every organic result on a Google results page, and
keyword metrics for the search itself. Data comes straight from your own
DataForSEO account; there is no server.

Per result: domain rank, referring domains, backlinks, estimated monthly
organic traffic and ranking keywords for the domain, plus rank, referring
domains and backlinks for the page.

Per search: volume, difficulty, CPC and intent.

## Install

```sh
pnpm install
pnpm build
```

In Chrome, open `chrome://extensions`, turn on Developer mode, choose
"Load unpacked" and pick `extension/.output/chrome-mv3`.

Click the toolbar icon, open Settings, and enter the API login and password
from your DataForSEO dashboard. They are stored only in the browser and sent
only to `api.dataforseo.com`.

## Cost

Each new search makes up to five DataForSEO requests: three Backlinks bulk
lookups, one Labs bulk traffic estimate and one keyword overview. DataForSEO
bills these to your account, and the Backlinks API has to be enabled on it.

- Results are cached for 24 hours, so a domain or page seen again costs nothing.
- The popup shows what the toolbar has spent today.
- A daily cap (default $1) stops new requests once it is reached.
- The popup switch turns the toolbar off entirely; nothing is fetched while off.

## Development

```sh
pnpm dev          # Chrome with the extension loaded and live reload
pnpm test
pnpm types:check
```

`src/lib/serp.ts` is the only file that knows Google's markup. If bars stop
appearing, save a results page, trim it into
`src/lib/fixtures/google-serp.html`, and fix the parser against it.

`src/lib/types.ts` defines `MetricsProvider`. DataForSEO is the only
implementation today; a provider backed by an OpenSEO server can replace it
without touching the toolbar.

## Status

The DataForSEO response handling is written from the API's documented shapes
and has not yet been run against a live account.
