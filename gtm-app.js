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
   date control between the hotel details and the room cards, and on submit
   rebuild the original single-hotel deeplink with the new dates and load it.
   On mobile it starts COLLAPSED as a "Choose your dates" bar, because the
   expanded card pushed the rooms themselves below the fold.

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
  var PANEL_ID = 'gtm-dc-panel';
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

  /* "12 Nov 2026". Used for the collapsed mobile summary line. */
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun',
                'Jul','Aug','Sep','Oct','Nov','Dec'];

  function fmtShort(iso, withYear) {
    var b = iso.split('-');
    if (b.length !== 3) return iso;
    var d = String(parseInt(b[2], 10));
    var mo = MONTHS[parseInt(b[1], 10) - 1] || b[1];
    return withYear ? d + ' ' + mo + ' ' + b[0] : d + ' ' + mo;
  }

  function summary(fromIso, toIso) {
    var sameYear = fromIso.slice(0, 4) === toIso.slice(0, 4);
    return fmtShort(fromIso, !sameYear) + ' to ' + fmtShort(toIso, true);
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
      '.' + ROOT + '{font-family:Manrope,system-ui,sans-serif;background:#FFF9EE;border:1px solid #0B152D;border-radius:2em;padding:0;margin:1.5rem 0;color:#0B152D;}',
      '.' + ROOT + ' *{box-sizing:border-box;}',
      /* The whole bar is ONE button, so the label, the dates and the chevron
         are all the same target - there is no chevron-only hit area. */
      '.' + ROOT + '-toggle{display:flex;width:100%;align-items:center;justify-content:space-between;gap:0.9rem;background:none;border:0;padding:1.05rem 1.5rem;font-family:inherit;color:#0B152D;text-align:left;cursor:pointer;}',
      /* Sentence case, still bold. The 0.1em tracking was set for capitals and
         reads airy without them, so it comes back to near-normal at the same
         time - the same correction made to the registration button in
         gtm-booking.css section 60a. Sized up so it still outranks the date
         line beneath it now that the capitals are not doing that work. */
      '.' + ROOT + '-tlabel{display:block;font-size:0.9rem;font-weight:700;letter-spacing:0.01em;}',
      '.' + ROOT + '-tnarrow{display:none;}',
      '.' + ROOT + '-tdates{display:block;font-size:0.82rem;margin-top:0.15rem;opacity:0.75;}',
      '.' + ROOT + '-chev{flex:0 0 auto;width:0.55rem;height:0.55rem;margin-right:0.3rem;border-right:2px solid #FF640F;border-bottom:2px solid #FF640F;transform:rotate(45deg);transition:transform 0.2s;}',
      '.' + ROOT + '.is-open .' + ROOT + '-chev{transform:rotate(-135deg);}',
      '.' + ROOT + '-panel{display:none;padding:0 1.5rem 1.35rem;}',
      '.' + ROOT + '.is-open .' + ROOT + '-panel{display:block;}',
      '.' + ROOT + '-row{display:flex;flex-wrap:wrap;align-items:flex-end;gap:0.75rem;}',
      '.' + ROOT + '-field{display:flex;flex-direction:column;flex:1 1 150px;min-width:140px;}',
      '.' + ROOT + '-field small{font-size:0.55rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.65;margin-bottom:0.25rem;}',
      '.' + ROOT + ' input[type="date"]{font-family:inherit;font-size:16px;color:#0B152D;background:#FFFFFF;border:1px solid #0B152D;border-radius:2em;padding:0.5rem 0.9rem;width:100%;height:auto;}',
      '.' + ROOT + '-btn{flex:0 0 auto;background:#FF640F;color:#FFF9EE;border:1px solid #FF640F;border-radius:2em;font-family:inherit;font-weight:700;font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase;padding:0.62rem 1.6rem;cursor:pointer;transition:background 0.18s,border-color 0.18s;}',
      '@media (hover:hover){.' + ROOT + '-btn:hover:not(:disabled){background:#0B152D;border-color:#0B152D;}}',
      '.' + ROOT + ' :focus-visible{outline:2px solid #FF640F;outline-offset:2px;}',
      '.' + ROOT + '-btn:active{transform:translateY(1px);}',
      '.' + ROOT + '-btn.is-busy{cursor:progress;opacity:0.72;}',
      '.' + ROOT + '-spin{display:none;width:0.75em;height:0.75em;margin-right:0.5em;vertical-align:-0.1em;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:gtm-dc-spin 0.6s linear infinite;}',
      '.' + ROOT + '-btn.is-busy .' + ROOT + '-spin{display:inline-block;}',
      '@keyframes gtm-dc-spin{to{transform:rotate(360deg);}}',
      '@media (prefers-reduced-motion:reduce){.' + ROOT + '-spin{animation:none;opacity:0.55;}.' + ROOT + '-chev{transition:none;}}',
      '.' + ROOT + '-note{font-size:0.72rem;margin:0.55rem 0 0;min-height:1.1em;}',
      '.' + ROOT + '-note.is-error{color:#FF640F;font-weight:600;}',
      /* Mobile: the card starts COLLAPSED as a tappable bar. The panel is shown by
         a class, not by JS style, so a desktop-width rotation always reveals it. */
      '@media (max-width:767px){' +
        /* Revelex insets its mobile content by 16px; the card was running full
           bleed and sitting wider than the room pills and the heading. */
        '.' + ROOT + '{margin:1.25rem 16px;}' +
        '.' + ROOT + '-toggle{padding:0.95rem 1.25rem;}' +
        '.' + ROOT + '-twide{display:none;}' +
        '.' + ROOT + '-tnarrow{display:inline;}' +
        '.' + ROOT + '-tlabel{font-size:0.85rem;}' +
        '.' + ROOT + '-tdates{font-size:0.78rem;}' +
        '.' + ROOT + '-panel{padding:0 1.25rem 1.2rem;}' +
        /* WARNING: `flex: 1 1 150px` in a COLUMN container sets the basis on the
           HEIGHT, which made every field 150px tall. Reset the basis. */
        '.' + ROOT + '-row{flex-direction:column;align-items:stretch;}' +
        '.' + ROOT + '-field{flex:0 0 auto;}' +
        '.' + ROOT + '-btn{width:100%;padding:0.75rem;margin-top:0.2rem;}' +
      '}'
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
      /* Mobile only (CSS-hidden above 767px): the collapsed bar. It names the
         action AND the dates currently being viewed, so the visitor can see
         both what they have and that it can be changed. */
      '<button type="button" class="' + ROOT + '-toggle" data-dc="toggle"' +
        ' aria-expanded="false" aria-controls="' + PANEL_ID + '">' +
        '<span>' +
          /* Two strings, one per width, rather than one string plus a hidden
             fragment: each width then reads exactly as written, punctuation
             included. The hidden one is display:none, so it is not announced. */
          '<span class="' + ROOT + '-tlabel">' +
            '<span class="' + ROOT + '-twide">Travelling on different dates? Choose your dates:</span>' +
            '<span class="' + ROOT + '-tnarrow">Choose your dates</span>' +
          '</span>' +
          '<span class="' + ROOT + '-tdates" data-dc="summary"></span>' +
        '</span>' +
        '<i class="' + ROOT + '-chev" aria-hidden="true"></i>' +
      '</button>' +
      '<div class="' + ROOT + '-panel" id="' + PANEL_ID + '">' +
        '<div class="' + ROOT + '-row">' +
          '<label class="' + ROOT + '-field"><small>Check-in</small>' +
            '<input type="date" data-dc="in"></label>' +
          '<label class="' + ROOT + '-field"><small>Check-out</small>' +
            '<input type="date" data-dc="out"></label>' +
          '<button type="button" class="' + ROOT + '-btn" data-dc="go">' +
            '<i class="' + ROOT + '-spin" aria-hidden="true"></i>' +
            '<span data-dc="golabel">Update dates</span></button>' +
        '</div>' +
        '<p class="' + ROOT + '-note" data-dc="note"></p>' +
      '</div>';

    var inEl = root.querySelector('[data-dc="in"]');
    var outEl = root.querySelector('[data-dc="out"]');
    var btn = root.querySelector('[data-dc="go"]');
    var label = root.querySelector('[data-dc="golabel"]');
    var note = root.querySelector('[data-dc="note"]');
    var toggle = root.querySelector('[data-dc="toggle"]');

    root.querySelector('[data-dc="summary"]').textContent =
      summary(checkIn, checkOut);

    /* The panel's visibility is CSS's job; this only flips the class.
       Deliberately NOT focusing the first field on open: on Android that can
       raise the native date picker before the visitor has looked at the panel,
       and the panel follows the toggle in DOM order so a keyboard user tabs
       straight into it anyway. */
    toggle.addEventListener('click', function () {
      var open = root.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

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

    anchor.parentNode.insertBefore(root, anchor.nextSibling);
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
