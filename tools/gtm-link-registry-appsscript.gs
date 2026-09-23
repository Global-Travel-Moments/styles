/**
 * GTM LINK REGISTRY - Google Apps Script backend
 * =============================================================
 * Receives links from gtm-link-generator.html and appends them to a sheet,
 * so the placement inventory lives somewhere shared rather than in one
 * browser's localStorage.
 *
 * SETUP (about five minutes, all in Paul's Google account)
 * -------------------------------------------------------------
 * 1. Create a Google Sheet. Name the first tab: Links
 * 2. Extensions → Apps Script. Delete the placeholder, paste this file.
 * 3. Change SHARED_TOKEN below to any random string of your choosing.
 * 4. Deploy → New deployment → type "Web app".
 *      Execute as:        Me
 *      Who has access:    Anyone
 *    "Anyone" is required — the generator posts without a Google login.
 *    That is why SHARED_TOKEN exists: it is the only thing stopping a
 *    stranger who finds the URL from appending junk rows. Treat the URL
 *    as semi-private, don't post it publicly, and rotate the token if it
 *    ever leaks (change it here, redeploy, update REGISTRY_TOKEN in Netlify,
 *    redeploy Netlify).
 * 5. Put the web app URL and the token into the deeplink generator's Netlify
 *    environment variables REGISTRY_URL and REGISTRY_TOKEN (secret,
 *    production). netlify/edge-functions/registry.js adds the token
 *    server-side, so nobody using the tool ever enters either.
 *
 * Every save is its own row, even for a link saved before (Paul, 2026-09-23:
 * "id rather we had it saved twice"). Column A is when the link was saved,
 * column B when the sheet received it. Nothing is ever merged or overwritten.
 *
 * NOTE: no secrets beyond the token live here, and the token is not a
 * credential for anything else. Do not put API keys in this file.
 */

var SHARED_TOKEN = 'CHANGE-ME-TO-SOMETHING-RANDOM';
var SHEET_NAME = 'Links';

/* This file is public (it lives in the styles repo, which jsDelivr needs).
   So the placeholder above is public too, and a deployment that still has
   it is unprotected. Rather than trust step 3 of the setup, refuse to
   write anything until the token has actually been changed. */
var TOKEN_UNSET = (SHARED_TOKEN === 'CHANGE-ME-TO-SOMETHING-RANDOM' || !SHARED_TOKEN);

var HEADERS = [
  'Saved', 'Last sent', 'Campaign', 'Campaign ID', 'Source', 'Medium',
  'Placement', 'Link type', 'Destination type', 'Hotel / place', 'GDS ID', 'URL'
];

function doPost(e) {
  try {
    if (TOKEN_UNSET) {
      return json({ ok: false, error: 'SHARED_TOKEN is still the placeholder — set it and redeploy' });
    }

    var payload = JSON.parse(e.postData.contents);

    if (payload.token !== SHARED_TOKEN) {
      return json({ ok: false, error: 'bad token' });
    }

    var links = payload.links || [];
    if (!links.length) return json({ ok: true, added: 0, updated: 0 });

    var sheet = getSheet();
    var now = new Date();
    var rows = links.map(function (link) { return rowFor(link, now); });
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length)
         .setValues(rows);

    return json({ ok: true, added: rows.length, updated: 0 });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** Lets you sanity-check the deployment in a browser tab. Add ?token=... to
    see the row count; without it this only confirms the script is alive, so
    a stranger who finds the URL learns nothing about what is in the sheet. */
function doGet(e) {
  if (TOKEN_UNSET) {
    return json({ ok: false, error: 'SHARED_TOKEN is still the placeholder — set it and redeploy' });
  }
  var token = (e && e.parameter && e.parameter.token) || '';
  if (token !== SHARED_TOKEN) {
    return json({ ok: true, service: 'GTM link registry' });
  }
  return json({ ok: true, service: 'GTM link registry', rows: Math.max(0, getSheet().getLastRow() - 1) });
}

function rowFor(link, now) {
  var u = link.utm || {};
  return [
    link.saved ? new Date(link.saved) : now,   // a real date, shown in the sheet's timezone
    now,
    u.utm_campaign || '',
    u.utm_id || '',
    u.utm_source || '',
    u.utm_medium || '',
    u.utm_content || '',
    u.utm_term || '',
    link.endpoint || '',
    link.hotel || link.destination || '',
    link.gdsId || '',
    link.url || ''
  ];
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
