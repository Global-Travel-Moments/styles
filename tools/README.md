# Deeplink and link generators

Standalone tools. Nothing here is served to the Revelex booking site.

| File | What |
|---|---|
| `gtm-link-generator.html` | The UTM link generator. This is the one deployed to Netlify |
| `hotel-deeplink-generator.html` | Older standalone single-hotel deeplink builder |
| `build-hotel-index.py` | Turns `GTCHotels.csv` (~85MB, ~990k rows) into the 3-file sharded `deploy/` site |
| `gtm-link-registry-appsscript.gs` | Google Apps Script backend for the link registry Sheet. The real shared token is set in the deployed copy, never here |
| `netlify.toml`, `netlify/edge-functions/auth.js` | Deploy config and the optional password gate. The password comes from the `SITE_PASSWORD` env var in the Netlify UI, never from this file |

**Run everything from inside this folder.** `build-hotel-index.py` resolves its
paths from its own location, and `netlify.toml`'s paths are relative to itself.

    python3 build-hotel-index.py
    npx netlify-cli deploy --dir=deploy --prod

`GTCHotels.csv`, `deploy/`, `deploy.zip` and `.netlify` are git-ignored.
