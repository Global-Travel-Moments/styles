/* ============================================================================
   GTM booking-site client JavaScript
   Served from https://cdn.jsdelivr.net/gh/Global-Travel-Moments/styles@main/gtm-app.js
   Loaded by footer.html / footer-uat.html, after Revelex's own bundle.

   Revelex Remote JavaScript rules (System Integration Guide v10.2, pp.8-9):
     - window.CLIENTJS is the ONLY global we are allowed. Everything hangs off it.
     - We must not manipulate or interact with Revelex-provided buttons, links,
       forms or form elements. So we READ their state and RENDER OUR OWN control.
       We never touch their date fields and we never hook their buttons.
     - Keep this file pure ASCII. Use \u escapes for anything else.
   ==========================================================================*/

window.CLIENTJS = window.CLIENTJS || {};

/* ----------------------------------------------------------------------------
   Date changer
   ----------------------------------------------------------------------------
   THE PROBLEM. A deeplink drops the visitor on one hotel with fixed dates.
   There are no search results behind them, so Revelex offers no way to change
   those dates. The visitor's only move is to start a new search from scratch,
   and most of them leave instead.

   THE FIX. Read the hotel and the current search off the page, render our own
   date control above the hotel card, and on submit rebuild the original
   single-hotel deeplink with the new dates and load it.

   THREE CONSTRAINTS, all load-bearing:
     1. Our own element only (rule 2 above).
     2. A FULL DOCUMENT LOAD, never a pushState-style URL swap. A client-side
        swap leaves stale room cards on screen. Standing build rule.
     3. The hotel ID is not in the URL by the time the visitor arrives, because
        search_hotels.html answers with a 302 that drops the whole query string.
        We read it from the DOM instead, so this works on every deeplink that
        is already out in the wild.
   --------------------------------------------------------------------------*/

window.CLIENTJS.dateChanger = (function () {
  'use strict';

  var HATOKEN = 'GTCGTM01';
  var ENDPOINT = '/app/0/hotel/0/room_availability.html';
  var GDS_SOURCE_TYPE = 3;          /* constant, per the integration guide */
  var ROOT = 'gtm-dc';
  var MAX_WAIT_MS = 30000;          /* Revelex can take 20s to render */
  var POLL_MS = 500;

  /* --- reading Revelex's state (read-only, never written to) -------------- */

  function hotelId() {
    var el = document.querySelector('[data-hotel]');
    if (el && el.dataset && el.dataset.hotel) return el.dataset.hotel;
    try {
      var rs = JSON.parse(sessionStorage.getItem('roomsStorage'));
      if (rs && rs.rooms && rs.rooms.length && rs.rooms[0].hotel_id) {
        return String(rs.rooms[0].hotel_id);
      }
    } catch (e) {}
    return null;
  }

  function searchParams() {
    try {
      var p = window.REVELEX.hotel.searchResults.settings.searchParams;
      if (p && p.check_in_date) return p;
    } catch (e) {}
    try {
      var rs = JSON.parse(sessionStorage.getItem('roomsStorage'));
      if (rs && rs.searchParams && rs.searchParams.check_in_date) return rs.searchParams;
    } catch (e2) {}
    return null;
  }

  /* --- dates: Revelex speaks MM/DD/YYYY, date inputs speak YYYY-MM-DD ----- */

  function pad(n) { return ('0' + n).slice(-2); }

  function toInput(us) {
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(us || '').trim());
    return m ? m[3] + '-' + pad(m[1]) + '-' + pad(m[2]) : '';
  }

  function toRevelex(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
    return m ? m[2] + '/' + m[3] + '/' + m[1] : '';
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function addDays(iso, n) {
    var p = iso.split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function nights(fromIso, toIso) {
    var p1 = fromIso.split('-'), p2 = toIso.split('-');
    var a = new Date(Number(p1[0]), Number(p1[1]) - 1, Number(p1[2]));
    var b = new Date(Number(p2[0]), Number(p2[1]) - 1, Number(p2[2]));
    return Math.round((b - a) / 86400000);
  }

  /* --- building the new deeplink ----------------------------------------- */

  function buildURL(id, params, checkInIso, checkOutIso) {
    var enc = encodeURIComponent;
    var q = [];
    q.push('hatoken=' + enc(HATOKEN));
    q.push(enc('search[hotel_list][gds_id][' + id + ']') + '=' + GDS_SOURCE_TYPE);
    q.push(enc('search[check_in_date]') + '=' + enc(toRevelex(checkInIso)));
    q.push(enc('search[check_out_date]') + '=' + enc(toRevelex(checkOutIso)));

    /* Carry the occupancy across unchanged. Anything dropped here silently
       resets to a Revelex default, which is how you lose a family booking. */
    var rooms = (params && params.rooms) || { '1': { number_adults: '2', number_children: '0' } };
    var keys = Object.keys(rooms);
    q.push('number-of-rooms=' + keys.length);
    keys.forEach(function (k) {
      var room = rooms[k] || {};
      q.push(enc('search[rooms][' + k + '][number_adults]') + '=' + enc(room.number_adults || '2'));
      q.push(enc('search[rooms][' + k + '][number_children]') + '=' + enc(room.number_children || '0'));
      var ages = room.children_ages;
      if (ages) {
        Object.keys(ages).forEach(function (ci) {
          q.push(enc('search[rooms][' + k + '][children_ages][' + ci + ']') + '=' + enc(ages[ci]));
        });
      }
    });

    /* Campaign data rides in the fragment because the 302 eats the query
       string. If this arrival carried one, keep it on the way through. */
    return ENDPOINT + '?' + q.join('&') + (window.location.hash || '');
  }

  /* --- our own markup ---------------------------------------------------- */

  function styles() {
    if (document.getElementById('gtm-dc-styles')) return;
    var css = [
      '.' + ROOT + '{font-family:Manrope,system-ui,sans-serif;background:#FFF9EE;border:1px solid #0B152D;border-radius:2em;padding:1.1rem 1.4rem;margin:0 0 1.25rem;color:#0B152D;}',
      '.' + ROOT + ' *{box-sizing:border-box;}',
      '.' + ROOT + '-head{font-size:0.62rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;opacity:0.75;margin:0 0 0.6rem;}',
      '.' + ROOT + '-row{display:flex;flex-wrap:wrap;align-items:flex-end;gap:0.75rem;}',
      '.' + ROOT + '-field{display:flex;flex-direction:column;flex:1 1 150px;min-width:140px;}',
      '.' + ROOT + '-field small{font-size:0.55rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.65;margin-bottom:0.25rem;}',
      '.' + ROOT + ' input[type="date"]{font-family:inherit;font-size:16px;color:#0B152D;background:#FFFFFF;border:1px solid #0B152D;border-radius:2em;padding:0.5rem 0.9rem;width:100%;height:auto;}',
      '.' + ROOT + '-btn{flex:0 0 auto;background:#FF640F;color:#FFF9EE;border:1px solid #FF640F;border-radius:2em;font-family:inherit;font-weight:700;font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase;padding:0.62rem 1.6rem;cursor:pointer;transition:background 0.18s,border-color 0.18s;}',
      '@media (hover:hover){.' + ROOT + '-btn:hover:not(:disabled){background:#0B152D;border-color:#0B152D;}}',
      '.' + ROOT + '-btn:active{transform:translateY(1px);}',
      '.' + ROOT + '-btn.is-busy{cursor:progress;opacity:0.72;}',
      '.' + ROOT + '-spin{display:none;width:0.75em;height:0.75em;margin-right:0.5em;vertical-align:-0.1em;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:gtm-dc-spin 0.6s linear infinite;}',
      '.' + ROOT + '-btn.is-busy .' + ROOT + '-spin{display:inline-block;}',
      '@keyframes gtm-dc-spin{to{transform:rotate(360deg);}}',
      '@media (prefers-reduced-motion:reduce){.' + ROOT + '-spin{animation:none;opacity:0.55;}}',
      '.' + ROOT + '-note{font-size:0.72rem;margin:0.55rem 0 0;min-height:1.1em;}',
      '.' + ROOT + '-note.is-error{color:#FF640F;font-weight:600;}',
      '@media (max-width:767px){.' + ROOT + '-row{flex-direction:column;align-items:stretch;}.' + ROOT + '-field{flex:0 0 auto;}.' + ROOT + '-btn{width:100%;padding:0.75rem;margin-top:0.2rem;}}'
    ].join('\n');
    var tag = document.createElement('style');
    tag.id = 'gtm-dc-styles';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  function render(anchor, id, params) {
    var checkIn = toInput(params.check_in_date);
    var checkOut = toInput(params.check_out_date);
    if (!checkIn || !checkOut) return false;

    styles();

    var root = document.createElement('div');
    root.className = ROOT;
    root.setAttribute('data-gtm-dc', '1');
    root.innerHTML =
      '<p class="' + ROOT + '-head">Travelling on different dates?</p>' +
      '<div class="' + ROOT + '-row">' +
        '<label class="' + ROOT + '-field"><small>Check-in</small>' +
          '<input type="date" data-dc="in"></label>' +
        '<label class="' + ROOT + '-field"><small>Check-out</small>' +
          '<input type="date" data-dc="out"></label>' +
        '<button type="button" class="' + ROOT + '-btn" data-dc="go">' +
          '<i class="' + ROOT + '-spin" aria-hidden="true"></i>' +
          '<span data-dc="golabel">Update dates</span></button>' +
      '</div>' +
      '<p class="' + ROOT + '-note" data-dc="note"></p>';

    var inEl = root.querySelector('[data-dc="in"]');
    var outEl = root.querySelector('[data-dc="out"]');
    var btn = root.querySelector('[data-dc="go"]');
    var label = root.querySelector('[data-dc="golabel"]');
    var note = root.querySelector('[data-dc="note"]');

    inEl.value = checkIn;
    outEl.value = checkOut;
    inEl.min = today();
    outEl.min = addDays(checkIn, 1);

    /* Keep the stay length when the arrival moves, as every booking form does.
       The visitor can still shorten or lengthen it afterwards. */
    inEl.addEventListener('change', function () {
      if (!inEl.value) return;
      var stay = Math.max(1, nights(checkIn, checkOut) || 1);
      if (!outEl.value || outEl.value <= inEl.value) {
        outEl.value = addDays(inEl.value, stay);
      }
      outEl.min = addDays(inEl.value, 1);
    });

    function busy(on) {
      btn.classList[on ? 'add' : 'remove']('is-busy');
      btn.disabled = on;
      btn.setAttribute('aria-busy', on ? 'true' : 'false');
      label.textContent = on ? 'Updating\u2026' : 'Update dates';
      inEl.disabled = on;
      outEl.disabled = on;
    }
    /* A Back-button return restores this page from cache mid-update. */
    window.addEventListener('pageshow', function () { busy(false); });

    btn.addEventListener('click', function () {
      note.className = ROOT + '-note';
      note.textContent = '';

      if (!inEl.value || !outEl.value) {
        note.className = ROOT + '-note is-error';
        note.textContent = 'Pick both dates.';
        return;
      }
      if (outEl.value <= inEl.value) {
        note.className = ROOT + '-note is-error';
        note.textContent = 'Check-out must be after check-in.';
        return;
      }
      if (inEl.value === checkIn && outEl.value === checkOut) {
        note.textContent = 'Those are the dates you are already viewing.';
        return;
      }

      busy(true);
      note.textContent = 'Fetching rates for your new dates. This can take a few seconds.';

      /* Full document load, deliberately. A client-side URL swap leaves the
         previous dates' room cards on screen. */
      window.location.href = buildURL(id, params, inEl.value, outEl.value);
    });

    anchor.parentNode.insertBefore(root, anchor);
    return true;
  }

  /* --- boot -------------------------------------------------------------- */

  function attempt() {
    if (document.querySelector('[data-gtm-dc]')) return true;   /* already placed */
    var anchor = document.querySelector('.hotel-hero-collage-wrapper');
    if (!anchor) return false;
    var id = hotelId();
    var params = searchParams();
    if (!id || !params) return false;
    try {
      return render(anchor, id, params);
    } catch (e) {
      return true;   /* fail quietly, never block the booking flow */
    }
  }

  function start() {
    if (!/\/hotel\/0\/(room_selection|room_availability)\.html/.test(window.location.pathname)) return;
    if (attempt()) return;
    /* Revelex renders asynchronously and can take 20s on a cold hotel and date
       combination, so poll rather than assume the page has finished. */
    var waited = 0;
    var timer = setInterval(function () {
      waited += POLL_MS;
      if (attempt() || waited >= MAX_WAIT_MS) clearInterval(timer);
    }, POLL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  return { start: start, buildURL: buildURL, hotelId: hotelId, searchParams: searchParams };
}());
