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
 *    ever leaks (change it here, redeploy, update it in the generator).
 * 5. Copy the web app URL, paste it into the generator's Sheet section
 *    along with the same token.
 *
 * The sheet is append-and-update: sending the same URL twice updates that
 * row's "last sent" rather than creating a duplicate, so re-sending is safe.
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
    var existing = urlRowMap(sheet);
    var now = new Date();
    var added = 0, updated = 0;
    var toAppend = [];

    links.forEach(function (link) {
      var row = rowFor(link, now);
      var found = existing[link.url];
      if (found) {
        sheet.getRange(found, 1, 1, HEADERS.length).setValues([row]);
        updated++;
      } else {
        toAppend.push(row);
        added++;
      }
    });

    if (toAppend.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, HEADERS.length)
           .setValues(toAppend);
    }

    return json({ ok: true, added: added, updated: updated });
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
    link.saved || '',
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

/** URL → row number, so a repeat send updates instead of duplicating. */
function urlRowMap(sheet) {
  var last = sheet.getLastRow();
  var map = {};
  if (last < 2) return map;
  var urlCol = HEADERS.indexOf('URL') + 1;
  var values = sheet.getRange(2, urlCol, last - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    var v = values[i][0];
    if (v) map[v] = i + 2;
  }
  return map;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
