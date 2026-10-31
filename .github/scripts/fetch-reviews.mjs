/* =====================================================================
   Refresh embeds/gtm-reviews.json from the Google Business Profile API.
   ---------------------------------------------------------------------
   Run daily by .github/workflows/gtm-reviews.yml, which stays off until
   the repo variable GTM_REVIEWS_ENABLED is set to "true".

   Three modes:
     node fetch-reviews.mjs              fetch and rewrite the JSON (the job)
     node fetch-reviews.mjs --discover   list the accounts and locations the
                                         token can see, to fill reviews-config.json
     node fetch-reviews.mjs --auth       one-off, on a Mac: sign in with a
                                         Google account that manages both
                                         listings and save a refresh token to
                                         ~/.gtm-reviews-token (never printed)

   Secrets come from the environment and are never written to the repo
   (it is public): GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN.

   Safety: any listing that fails to load stops the run and the existing
   file stays as it is. A result with far fewer reviews than the current
   file is refused too, so an API hiccup cannot empty the embeds.
   ===================================================================== */
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const DATA = join(REPO, 'embeds', 'gtm-reviews.json');
const CONFIG = JSON.parse(readFileSync(join(HERE, 'reviews-config.json'), 'utf8'));
const SCOPE = 'https://www.googleapis.com/auth/business.manage';
const STARS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

const env = name => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
};

async function accessToken() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('GBP_CLIENT_ID'),
      client_secret: env('GBP_CLIENT_SECRET'),
      refresh_token: env('GBP_REFRESH_TOKEN'),
      grant_type: 'refresh_token'
    })
  });
  if (!r.ok) throw new Error(`Token refresh failed: ${r.status} ${await r.text()}`);
  return (await r.json()).access_token;
}

async function get(url, token) {
  const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`${r.status} ${url}\n${await r.text()}`);
  return r.json();
}

/* Google appends its own translation to reviews written in another language.
   Keep only what the reviewer wrote, which is what the listing shows first. */
function original(comment) {
  let t = String(comment || '');
  const o = t.indexOf('(Original)\n');
  if (o !== -1) t = t.slice(o + '(Original)\n'.length);
  const tr = t.indexOf('\n\n(Translated by Google)');
  if (tr !== -1) t = t.slice(0, tr);
  return t.trim();
}

async function fetchListing(listing, token) {
  const base = `https://mybusiness.googleapis.com/v4/${CONFIG.account}/${listing.location}/reviews`;
  const reviews = [];
  let pageToken = '', rating = null;
  do {
    const page = await get(`${base}?pageSize=50${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`, token);
    if (page.averageRating != null) rating = Number(page.averageRating).toFixed(1);
    for (const r of page.reviews || []) {
      reviews.push({
        listing: listing.id,
        name: r.reviewer?.displayName || 'A Google user',
        stars: STARS[r.starRating] || 0,
        date: String(r.createTime || '').slice(0, 10),
        text: original(r.comment)
      });
    }
    pageToken = page.nextPageToken || '';
  } while (pageToken);
  if (!rating) throw new Error(`No rating returned for ${listing.id}`);
  return { rating, reviews };
}

async function refresh() {
  const token = await accessToken();
  const listings = [], reviews = [];
  for (const l of CONFIG.listings) {
    if (!l.location) throw new Error(`reviews-config.json: no location for ${l.id} (run --discover)`);
    const got = await fetchListing(l, token);
    listings.push({ id: l.id, label: l.label, rating: got.rating, url: l.url });
    reviews.push(...got.reviews);
  }
  reviews.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));

  const current = JSON.parse(readFileSync(DATA, 'utf8'));
  const before = (current.reviews || []).length;
  if (reviews.length < Math.floor(before / 2)) {
    throw new Error(`Refusing to write: ${reviews.length} reviews from Google against ${before} in the file`);
  }
  const next = { ...current, source: 'google-api', listings, reviews };
  const same = JSON.stringify({ ...next, updated: '' }) === JSON.stringify({ ...current, updated: '' });
  if (same) { console.log(`No change (${reviews.length} reviews)`); return; }
  next.updated = new Date().toISOString().slice(0, 10);
  writeFileSync(DATA, JSON.stringify(next, null, 2) + '\n');
  console.log(`Wrote ${reviews.length} reviews: ` + listings.map(l => `${l.label} ${l.rating}`).join(', '));
}

async function discover() {
  const token = await accessToken();
  const accounts = await get('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', token);
  for (const a of accounts.accounts || []) {
    console.log(`${a.name}  ${a.accountName}  (${a.type})`);
    const locs = await get(`https://mybusinessbusinessinformation.googleapis.com/v1/${a.name}/locations?readMask=name,title,storefrontAddress,metadata&pageSize=100`, token);
    for (const l of locs.locations || []) {
      console.log(`   ${l.name}  ${l.title}  ${l.storefrontAddress?.locality || ''}  ${l.metadata?.mapsUri || ''}`);
    }
  }
}

/* Loopback sign-in. The refresh token goes to a private file in the home
   folder, never to the screen, so it cannot end up in a log or a chat. */
async function auth() {
  const clientId = env('GBP_CLIENT_ID'), clientSecret = env('GBP_CLIENT_SECRET');
  const server = createServer();
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const redirect = `http://127.0.0.1:${server.address().port}`;
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: clientId, redirect_uri: redirect, response_type: 'code', scope: SCOPE,
    access_type: 'offline', prompt: 'consent'
  });
  console.log('Open this link, sign in with an account that manages both listings, and allow access:\n\n' + url + '\n');
  const code = await new Promise(res => server.on('request', (req, resp) => {
    const c = new URL(req.url, redirect).searchParams.get('code');
    resp.end(c ? 'Done. You can close this tab.' : 'No code received.');
    if (c) { server.close(); res(c); }
  }));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirect, grant_type: 'authorization_code' })
  });
  const body = await r.json();
  if (!body.refresh_token) throw new Error('No refresh token returned: ' + JSON.stringify({ error: body.error, description: body.error_description }));
  const file = join(homedir(), '.gtm-reviews-token');
  writeFileSync(file, body.refresh_token, { mode: 0o600 });
  console.log('Refresh token saved to ' + file + '. Add it to GitHub as the secret GBP_REFRESH_TOKEN.');
}

const mode = process.argv[2];
(mode === '--discover' ? discover() : mode === '--auth' ? auth() : refresh())
  .catch(e => { console.error(e.message || e); process.exit(1); });
