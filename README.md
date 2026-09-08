# Global Travel Moments - styles

**This repo is public.** It has to be: jsDelivr only serves public repos, and the
Revelex booking site pulls its chrome from here. Anything committed is
world-readable and stays in the history. No client data, no credentials.

## Root: the files Revelex serves. DO NOT MOVE OR RENAME THESE.

Revelex and jsDelivr point at fixed URLs of the form
`https://cdn.jsdelivr.net/gh/Global-Travel-Moments/styles@main/<file>`.
Renaming or moving any file below breaks the live booking site. Updating one is
just commit and push; the URL never changes.

| File | Serves |
|---|---|
| `gtm-index.css` | Prod stylesheet |
| `gtm-booking.css` | UAT stylesheet, and the Prod replacement at cutover |
| `header.html` / `footer.html` | Prod chrome |
| `header-uat.html` / `footer-uat.html` | UAT chrome |
| `gtm-app.js` | Our client JavaScript. Currently the hotel-page date changer |
| `css/` (4 files), `js/webflow.js` | The Webflow header bundle those files link to |

Prod and UAT run as **parallel files** on purpose. One URL cannot serve both
environments, because any edit is atomic across both and leaves a broken window
somewhere. Cutover is a clean switch between two known-good sets:
**header first, then CSS, never CSS-first.**

## `tools/`: the deeplink and link generators

A separate Netlify-deployed app that happens to live in this repo. It is
**not** git-connected: Netlify publishes the local `deploy/` folder via a manual
CLI deploy, so nothing in here affects the live generator until you run it.

    cd tools && python3 build-hotel-index.py        # rebuild from GTCHotels.csv
    cd tools && npx netlify-cli deploy --dir=deploy --prod

Run both **from inside `tools/`**. See `tools/netlify.toml`.

## What is deliberately not here

- The Webflow search-bar embeds. They live in `~/Desktop/GTM Embeds/search-bars/`
  and are pasted into Webflow, not hosted. Five stale May copies were deleted
  from this repo on 2026-09-08 so nobody pastes the wrong one.
- `Analytics/`, GA4 exports and working spreadsheets. Local only, git-ignored.
