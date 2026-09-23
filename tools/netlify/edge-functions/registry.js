/* Link registry relay: the generator page -> the Google Sheet.
 *
 * The page posts saved links here, and this forwards them to the Apps Script
 * web app with the shared token added server-side. So nobody using the tool
 * types a URL or token, and neither appears in the page or in this committed
 * file (the styles repo is public).
 *
 * Needs two Netlify environment variables (Site configuration -> Environment
 * variables, both marked secret):
 *   REGISTRY_URL    the Apps Script web app URL, ending /exec
 *   REGISTRY_TOKEN  the SHARED_TOKEN set in the Apps Script editor
 *
 * Only people with the site password can reach it: it runs the same gate as
 * auth.js itself, so that holds whatever order Netlify runs the two in.
 *
 * Unlike the old browser-side post (no-cors, unreadable), a server-side fetch
 * can read the Apps Script reply, so the page is told whether the row landed.
 *
 * GET  -> { ok, rows }                 connection check, shown in section 7
 * POST { links: [...] } -> { ok, added, updated }
 */
import gate from './auth.js';

const MAX_LINKS = 200;

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

async function relay(res) {
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { return json({ ok: false, error: 'The sheet replied with something other than JSON (HTTP ' + res.status + ').' }, 502); }
  return json(data, data.ok ? 200 : 502);
}

export default async (request, context) => {
  const denied = await gate(request, context);
  if (denied) return denied;

  const url = Netlify.env.get('REGISTRY_URL');
  const token = Netlify.env.get('REGISTRY_TOKEN');
  if (!url || !token) {
    return json({ ok: false, error: 'The sheet connection is not configured on the server.' }, 503);
  }

  try {
    if (request.method === 'GET') {
      const res = await fetch(url + '?token=' + encodeURIComponent(token), { redirect: 'follow' });
      return await relay(res);
    }

    if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);

    let body;
    try { body = await request.json(); }
    catch { return json({ ok: false, error: 'Request body was not JSON.' }, 400); }

    const links = Array.isArray(body && body.links) ? body.links : [];
    if (!links.length) return json({ ok: true, added: 0, updated: 0 });
    if (links.length > MAX_LINKS) return json({ ok: false, error: 'Too many links in one go (max ' + MAX_LINKS + ').' }, 413);

    // Apps Script runs doPost (the row is written HERE), then answers 302 to a
    // googleusercontent "echo" URL that holds the reply. That URL must be
    // fetched with GET. The edge runtime's automatic redirect re-POSTs to it,
    // and Google answers a POST there with a Drive "file cannot be opened" 404,
    // so the row landed but the page was told it failed (found 2026-09-23).
    // Follow the redirect by hand, as a GET.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: token, links: links }),
      redirect: 'manual'
    });
    const echo = res.status >= 300 && res.status < 400 && res.headers.get('location');
    return await relay(echo ? await fetch(echo, { redirect: 'follow' }) : res);
  } catch (e) {
    return json({ ok: false, error: 'Could not reach the sheet: ' + (e && e.message ? e.message : e) }, 502);
  }
};

export const config = { path: '/api/registry' };
