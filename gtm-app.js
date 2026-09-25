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

/* ----------------------------------------------------------------------------
   Partner arrival (Capella item 4, the "D1 hash-reader")
   ----------------------------------------------------------------------------
   THE PROBLEM. Our partner links (OutThere, the Capella pages, Brevo) carry
   their UTMs twice, in the query string and after the #, because Revelex's
   302 on room_availability.html and search_hotels.html throws the query string
   away. GA4 never reads the # part, so a visitor who lands here cold arrives
   as a bare referral or as direct, and the campaign and placement are lost.

   WHY NOT FIX THE SESSION ITSELF. The plan was a header script that copies
   the # values into the query string before Google's tag reads the page.
   Measured on the live room page 2026-09-24: Revelex streams the <head> in
   two parts, and their gtag.js has ALREADY sent the page_view 3 to 6 seconds
   before our header slot is even parsed. Nothing in a slot we own can run
   first. Only Revelex can place a script above their tag (a Marco ask).

   WHAT THIS DOES INSTEAD. Reads the # values and sends them as one GA4 event,
   partner_arrival, once per link per tab. The session keeps whatever source
   GA4 gave it; the campaign and placement become event parameters that can be
   joined to hotel_desk_booking in an exploration. Read-only on the page.
   search_hotel_id deliberately reuses the website's parameter name, so one
   GA4 custom dimension covers both.
   --------------------------------------------------------------------------*/

window.CLIENTJS.arrival = (function () {
  'use strict';

  var KEY = 'gtm_arrival_sent';
  var FIELDS = ['source', 'medium', 'campaign', 'content', 'term', 'id'];

  function read() {
    var h = window.location.hash;
    if (!h || h.indexOf('utm_') === -1) return null;
    var out = {}, found = false;
    var parts = h.slice(1).split('&');
    for (var i = 0; i < parts.length; i++) {
      var m = parts[i].match(/^utm_(source|medium|campaign|content|term|id)=([^&]*)$/);
      if (!m || !m[2]) continue;
      try { out[m[1]] = decodeURIComponent(m[2].replace(/\+/g, ' ')).slice(0, 100); } catch (e) { continue; }
      found = true;
    }
    return found ? out : null;
  }

  function page() {
    var p = window.location.pathname;
    if (/room_(selection|availability)\.html$/.test(p)) return 'room';
    if (/hotel_selection\.html$/.test(p)) return 'results';
    return p.split('/').pop().replace(/\.html$/, '').slice(0, 40) || 'other';
  }

  function send() {
    var utm = read();
    if (!utm || typeof window.gtag !== 'function') return;
    /* Once per link per tab. The date changer carries the # onto every new
       set of dates, and that must not count as a second arrival. */
    var sig = FIELDS.map(function (f) { return utm[f] || ''; }).join('|');
    try {
      if (window.sessionStorage.getItem(KEY) === sig) return;
      window.sessionStorage.setItem(KEY, sig);
    } catch (e) { /* storage blocked: send anyway, a rare double beats nothing */ }
    var hotel = document.querySelector('[data-hotel]');
    var params = { arrival_page: page() };
    for (var i = 0; i < FIELDS.length; i++) {
      if (utm[FIELDS[i]]) params['arrival_' + FIELDS[i]] = utm[FIELDS[i]];
    }
    if (hotel && hotel.getAttribute('data-hotel')) params.search_hotel_id = hotel.getAttribute('data-hotel');
    window.gtag('event', 'partner_arrival', params);
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { try { send(); } catch (e) { /* never block */ } });
    } else {
      send();
    }
  } catch (e) { /* tracking must never break the page */ }

  return { read: read };
}());

/* ----------------------------------------------------------------------------
   Account gate
   ----------------------------------------------------------------------------
   THE PROBLEM. Anyone can book on the Hotel Desk without an account, and GTC
   need every booking to come from a signed-in member. Revelex has no setting
   we can switch for this.

   THE FIX. Search stays open. On the results page and the room page, a
   signed-out visitor sees our own "Create account" button and "Sign in" link
   where each Select button was. After they register or sign in we send them
   back to the page they left, and their results are still there.

   THE RETURN RE-RUNS THE SEARCH. Revelex keeps the search in the server
   session, but after registration its own server redirects to
   login.html?clear=all, which empties that session (Paul's live test,
   2026-09-23). So on click we save the search as a deeplink and load it once
   they are signed in. See searchURL(). Our own gate links still never carry
   clear=all.

   HOW IT STAYS INSIDE RULE 2. We never touch their buttons or forms. We add
   our own element as a sibling AFTER their form, and CSS hides a form only
   when our gate sits next to it (form:has(+ .gtm-gate)). The signed-in state
   is read from their own account menu, never written.

   FAILS OPEN, deliberately. If this file does not load, :has() is not
   supported, or the sign-in state has not resolved yet, their Select buttons
   stay visible and the booking works as before. The wall must never become a
   dead end.

   EXCEPTIONS. Hotels in OPEN_HOTELS never get the wall (the six Capella
   campaign properties, Paul 2026-09-25).

   SIGNED-IN STATE. Revelex renders all four account-menu links with .is-hidden
   and un-hides one pair after fetch_authentication_status.json answers:
     signed out -> .authentication-module-login  loses .is-hidden
     signed in  -> .authentication-module-logout loses .is-hidden
   Both hidden = not resolved yet. So "logout is hidden" alone does NOT prove
   signed out; it is also true for the first moment of every page.
   --------------------------------------------------------------------------*/

window.CLIENTJS.accountGate = (function () {
  'use strict';

  var HATOKEN = 'GTCGTM01';
  var KEY = 'gtm_gate_return';
  var MAX_AGE_MS = 60 * 60 * 1000;  /* a return older than an hour is stale */
  var ROOT = 'gtm-gate';
  var PAGES = /\/hotel\/0\/(hotel_selection|room_selection)\.html$/;
  /* Results: two per hotel (list + map pop-up). Room page: one per rate. */
  var SELECT_BUTTONS = 'button[data-select-hotel-button], button.hotel-room-select-button';

  var SIGNED_OUT = '.authentication-module-login:not(.is-hidden)';
  var SIGNED_IN = '.authentication-module-logout:not(.is-hidden)';

  /* NO WALL for these hotels (GDSHotelIDs). Paul, 2026-09-25: the six
     OutThere x Capella campaign properties book with zero friction, so their
     Select stays Revelex's own on the results and room pages. Every other
     hotel keeps the wall. If a hotel's ID cannot be read, it gets the wall. */
  var OPEN_HOTELS = {
    '100731601': 'Capella Bangkok',
    '100033282': 'Capella Singapore',
    '102925241': 'Capella Taipei',
    '103644183': 'Capella Kyoto',
    '102253845': 'Patina Maldives',
    '102856219': 'Patina Osaka'
  };

  /* --- state (read-only) ------------------------------------------------- */

  /* The hotel a Select belongs to, read from Revelex's markup (never written).
       Results page: each form names it, search[hotel_list][gds_hotel_id][ID].
       Room page: one hotel, on [data-hotel] above the rates. Each rate's
         room_id is also base64 of "-3-ID-...", used if [data-hotel] is missing.
     Checked live 2026-09-25 on Capella Bangkok and Patina Maldives. */
  function formHotelId(form) {
    var els = form.elements;
    for (var i = 0; i < els.length; i++) {
      var m = (els[i].name || '').match(/\[gds_hotel_id\]\[(\d+)\]/);
      if (m) return m[1];
    }
    if (pageName() !== 'room') return null;
    var el = document.querySelector('[data-hotel]');
    if (el && el.getAttribute('data-hotel')) return el.getAttribute('data-hotel');
    var room = form.querySelector('[name$="[room_id]"]');
    try {
      var r = room && window.atob(room.value).match(/^-\d+-(\d+)-/);
      if (r) return r[1];
    } catch (e) { /* not base64: unknown hotel, so it keeps the wall */ }
    return null;
  }

  function isOpenHotel(form) {
    var id = formHotelId(form);
    return !!(id && Object.prototype.hasOwnProperty.call(OPEN_HOTELS, id));
  }

  function authState() {
    if (document.querySelector(SIGNED_IN)) return 'in';
    if (document.querySelector(SIGNED_OUT)) return 'out';
    return null;
  }

  function pageName(path) {
    return /room_selection/.test(path || window.location.pathname) ? 'room' : 'results';
  }

  /* gate_action: create_account | sign_in on the click, then
     returned_after_create | returned_after_sign_in when we bring them back.
     gate_page is the page they left, also on the return (which fires from the
     account page, so it must come from the saved path, not the current one). */
  function track(action, path) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'account_gate', { gate_action: action, gate_page: pageName(path) });
      }
    } catch (e) { /* tracking must never break the page */ }
  }

  function readReturn() {
    try {
      var v = JSON.parse(window.sessionStorage.getItem(KEY) || 'null');
      if (v && v.path && (Date.now() - v.t) < MAX_AGE_MS) return v;
    } catch (e) { /* storage blocked or corrupt */ }
    return null;
  }

  /* The search itself, as a deeplink that re-runs it.
     WHY NOT JUST GO BACK TO THE PAGE. Tested live by Paul 2026-09-23: after
     registering, Revelex's own server sends the visitor to login.html?clear=all,
     which empties the session. Going back to hotel_selection.html then 302s to
     a blank search.html. So we rebuild the search from what we read here.
       Results page: their Modify Search form carries every search[...] field
         (place, coordinates, distance, dates, rooms, ages, stars). Read only.
       Room page: the date changer already rebuilds the hotel's deeplink.
     No clear=all on either: they are signed in by then and it would undo that. */
  function isoDate(us) {
    var m = String(us || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    return m ? m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2) : '';
  }

  function searchURL() {
    var enc = encodeURIComponent;
    if (pageName() === 'room') {
      var dc = window.CLIENTJS.dateChanger;
      if (!dc) return null;
      var id = dc.hotelId();
      var p = dc.searchParams();
      var ci = isoDate(p.check_in_date), co = isoDate(p.check_out_date);
      if (!id || !p || !ci || !co) return null;
      return dc.buildURL(id, p, ci, co);
    }
    var form = document.querySelector('form[action*="search_hotels.html"]');
    if (!form) return null;
    var q = ['hatoken=' + enc(HATOKEN)];
    var els = form.elements;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el.name || el.name.indexOf('search[') !== 0 || el.value === '') continue;
      if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) continue;
      q.push(enc(el.name) + '=' + enc(el.value));
    }
    /* Coordinates are what the search actually runs on. Without them it is
       not a search, so fall back to the page. */
    if (q.join('&').indexOf('latitude') === -1) return null;
    return form.getAttribute('action').split('?')[0] + '?' + q.join('&');
  }

  function saveReturn(action) {
    var url = null;
    try { url = searchURL(); } catch (e) { /* fall back to the page alone */ }
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify({ path: window.location.pathname, url: url, action: action, t: Date.now() }));
    } catch (e) { /* storage blocked: they still get to register, just no return */ }
  }

  function clearReturn() {
    try { window.sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  /* Their own menu links carry the right base for whichever environment we are
     in (Prod or UAT). Fall back to the Prod paths if the menu is missing. */
  function accountURL(cls, fallback) {
    var a = document.querySelector('a.' + cls);
    var base = (a && a.href) ? a.href.split('?')[0].split('#')[0] : fallback;
    return base + '?hatoken=' + HATOKEN;
  }

  /* --- our own markup ---------------------------------------------------- */

  function styles() {
    if (document.getElementById(ROOT + '-styles')) return;
    var css = [
      /* Hidden unless the browser has :has() AND the visitor is confirmed
         signed out. Without either, their Select stays and ours never shows. */
      '.' + ROOT + '{display:none;}',
      '@supports selector(:has(a)){' +
        'body:has(' + SIGNED_OUT + ') .' + ROOT + '{display:flex;}' +
        'body:has(' + SIGNED_OUT + ') form:has(+ .' + ROOT + '){display:none !important;}' +
      '}',
      /* Column: sign-in line on top, the pill underneath, so the pill's bottom
         edge lines up with the Details button beside it (their row is
         align-items:flex-end). */
      /* Right-aligned column (Paul, 2026-09-23): the Sign in button's right edge
         sits on Create account's right edge, with "Already a member?" beside it. */
      '.' + ROOT + '{flex-direction:column;align-items:flex-end;gap:0.5rem;font-family:Manrope,sans-serif;}',
      /* NOTE: both links carry "button" in their class on purpose. gtm-booking.css
         rule 14 turns every <a> orange unless its class contains "button". */
      '.' + ROOT + ' a.' + ROOT + '-button{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;height:50px;min-width:104px;padding:8.16px 24.48px;' +
        'background:#FF640F;border:1px solid #FF640F;border-radius:34px;color:#FFF9EE !important;font-family:Manrope,sans-serif;font-size:13.6px;font-weight:700;' +
        'letter-spacing:1.632px;line-height:13.6px;text-transform:uppercase;text-decoration:none !important;white-space:nowrap;cursor:pointer;transition:background 0.18s,border-color 0.18s;}',
      '@media (hover:hover){.' + ROOT + ' a.' + ROOT + '-button:hover{background:#0B152D;border-color:#0B152D;}}',
      '.' + ROOT + ' a.' + ROOT + '-button.is-busy{cursor:progress;opacity:0.72;}',
      /* "Already a member?" + a compact outline Sign in button, in the Details
         button's style (Midnight 2px outline) so it reads as clickable without
         competing with the orange Create account. Paul, 2026-09-23: the
         original underlined text link was too small to notice. */
      '.' + ROOT + '-note{display:flex;align-items:center;justify-content:flex-end;flex-wrap:nowrap;white-space:nowrap;gap:0.5rem;margin:0;font-size:13px;line-height:1.3;color:#0B152D;}',
      '.' + ROOT + ' a.' + ROOT + '-signin-button{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;height:34px;padding:0 16px;' +
        'background:transparent;border:2px solid #0B152D;border-radius:34px;color:#0B152D !important;font-family:Manrope,sans-serif;font-size:12px;font-weight:700;' +
        'letter-spacing:1.2px;line-height:1;text-transform:uppercase;text-decoration:none !important;white-space:nowrap;transition:background 0.18s,color 0.18s;}',
      '@media (hover:hover){.' + ROOT + ' a.' + ROOT + '-signin-button:hover{background:#0B152D;color:#FFF9EE !important;}}',
      '.' + ROOT + ' a:focus-visible{outline:2px solid #FF640F;outline-offset:2px;}',
      '.' + ROOT + '-spin{display:none;width:0.75em;height:0.75em;margin-right:0.5em;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:gtm-gate-spin 0.6s linear infinite;}',
      '.' + ROOT + ' .is-busy .' + ROOT + '-spin{display:inline-block;}',
      '@keyframes gtm-gate-spin{to{transform:rotate(360deg);}}',
      '@media (prefers-reduced-motion:reduce){.' + ROOT + '-spin{animation:none;opacity:0.55;}}',
      /* Mobile: their Select fills its half of the row (results) or the whole
         width (room page). Ours takes the same share. */
      '@media (max-width:767px){' +
        '.' + ROOT + '{flex:1 1 0;min-width:0;align-items:stretch;}' +
        '.' + ROOT + '-note{text-align:right;}' +
        '.' + ROOT + ' a.' + ROOT + '-button{width:100%;height:44px;padding:8px 12px;font-size:13px;letter-spacing:1.2px;}' +
      '}',
      /* The room page's Select is 50px tall at every width. */
      '.hotel-room-page .' + ROOT + ' a.' + ROOT + '-button{height:50px;}'
    ].join('\n');
    var tag = document.createElement('style');
    tag.id = ROOT + '-styles';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  function busy(link) {
    link.classList.add('is-busy');
    var label = link.querySelector('.' + ROOT + '-label');
    if (label) label.textContent = 'Opening\u2026';
  }

  function gate() {
    var root = document.createElement('div');
    root.className = ROOT;
    root.setAttribute('data-gtm-gate', '1');

    var note = document.createElement('p');
    note.className = ROOT + '-note';
    note.appendChild(document.createTextNode('Already a member? '));
    var signin = document.createElement('a');
    signin.className = ROOT + '-signin-button';
    signin.href = accountURL('authentication-module-login', 'https://book.globaltravelmoments.com/app/0/users/0/login.html');
    signin.textContent = 'Sign in';
    note.appendChild(signin);

    var create = document.createElement('a');
    create.className = ROOT + '-button';
    create.href = accountURL('authentication-module-register', 'https://book.globaltravelmoments.com/app/0/users/0/registration.html');
    create.innerHTML = '<span class="' + ROOT + '-spin" aria-hidden="true"></span><span class="' + ROOT + '-label">Create account</span>';

    /* Never preventDefault: these are ordinary links, we only remember where
       the visitor was before they leave. */
    signin.addEventListener('click', function () { saveReturn('sign_in'); track('sign_in'); });
    create.addEventListener('click', function () { saveReturn('create_account'); track('create_account'); busy(create); });

    root.appendChild(note);
    root.appendChild(create);
    return root;
  }

  /* One gate after each of their forms. Their markup is never written to;
     the WeakSet remembers which forms already have one. */
  var done = typeof WeakSet === 'function' ? new WeakSet() : null;

  function place() {
    if (!done) return;
    var buttons = document.querySelectorAll(SELECT_BUTTONS);
    for (var i = 0; i < buttons.length; i++) {
      var form = buttons[i].form;
      if (!form || done.has(form) || !form.parentNode) continue;
      if (isOpenHotel(form)) { done.add(form); continue; }
      var next = form.nextElementSibling;
      if (!(next && next.getAttribute('data-gtm-gate'))) {
        form.parentNode.insertBefore(gate(), form.nextSibling);
      }
      done.add(form);
    }
  }

  /* --- the return trip --------------------------------------------------- */

  /* Where Revelex lands a visitor after signing in. We show the message here
     straight away, because the wait before we can confirm the sign-in is
     theirs (the page plus its authentication-status call) and reads as a
     dead end without it. */
  var LANDING = /\/profile\/0\/home\.html$/;

  /* Revelex can force a password change at sign-in (seen by Paul 2026-09-23
     on an older account). Never take anyone off a page that is asking for a
     password: keep the saved search and return them after they have saved it. */
  function onPasswordPage() {
    var inputs = document.querySelectorAll('input[type="password"]');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].offsetParent !== null) return true;
    }
    return false;
  }

  var OVERLAY = ROOT + '-returning';

  function node(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text) el.textContent = text;
    return el;
  }

  function showReturning() {
    if (document.getElementById(OVERLAY) || !document.body) return;
    if (!document.getElementById(OVERLAY + '-styles')) {
      var css = [
        '#' + OVERLAY + '{position:fixed;inset:0;z-index:2147483001;visibility:visible;display:flex;align-items:center;justify-content:center;padding:16px;background:#FFF9EE;font-family:Manrope,sans-serif;color:#0B152D;}',
        '#' + OVERLAY + ' .' + OVERLAY + '-card{max-width:380px;text-align:center;}',
        '#' + OVERLAY + ' .' + OVERLAY + '-spin{display:block;box-sizing:border-box;width:28px;height:28px;margin:0 auto 16px;border:3px solid #FF640F;border-right-color:transparent;border-radius:50%;animation:gtm-gate-spin 0.7s linear infinite;}',
        /* Fixed px geometry (28 spinner + 16 gap + 24 line = 68px, centred) so the
           header.html pre-cover can draw the same thing in the same place. */
        '#' + OVERLAY + ' .' + OVERLAY + '-title{margin:0;font-size:18.4px;font-weight:700;line-height:24px;}',
        '@keyframes gtm-gate-spin{to{transform:rotate(360deg);}}',
        '@media (prefers-reduced-motion:reduce){#' + OVERLAY + ' .' + OVERLAY + '-spin{animation:none;opacity:0.55;}}'
      ].join('\n');
      var tag = document.createElement('style');
      tag.id = OVERLAY + '-styles';
      tag.textContent = css;
      document.head.appendChild(tag);
    }
    var el = node('div');
    el.id = OVERLAY;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    var card = node('div', OVERLAY + '-card');
    var spin = node('span', OVERLAY + '-spin');
    spin.setAttribute('aria-hidden', 'true');
    card.appendChild(spin);
    card.appendChild(node('p', OVERLAY + '-title', 'Taking you back to your search\u2026'));
    el.appendChild(card);
    document.body.appendChild(el);
  }

  /* header.html may have hidden the account page before it painted (see
     "account-gate pre-cover" there). Whenever we are NOT taking them back,
     that cover must come off. */
  function removePrecover() {
    var el = document.getElementById(ROOT + '-precover');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function hideReturning() {
    var el = document.getElementById(OVERLAY);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    removePrecover();
  }

  function maybeReturn() {
    var saved = readReturn();
    if (!saved) { hideReturning(); return; }
    /* Already back on the page they left, with their hotels showing. */
    if (window.location.pathname === saved.path && document.querySelector(SELECT_BUTTONS)) {
      clearReturn();
      hideReturning();
      return;
    }
    if (onPasswordPage()) { hideReturning(); return; }   /* keep the key for later */
    showReturning();
    clearReturn();                  /* before leaving, so it can never loop */
    /* STALE RATES. Revelex's room page saves its rooms and rate ids in
       sessionStorage.roomsStorage and, for the SAME hotel and dates, renders
       from that saved copy instead of the fresh server answer (proved
       2026-09-23: a planted marker came back as the Select room rate id).
       The copy saved while signed out survives sign-in, so every Select room
       sent signed-out rate ids: "The selected room is no longer available".
       New dates overwrite it, which is why the date changer "fixed" it.
       Removing it before we go leaves the browser as a new tab would be; the
       room page rebuilds it from the server. We never write to it. */
    try { window.sessionStorage.removeItem('roomsStorage'); } catch (e) { /* ignore */ }
    track(saved.action === 'create_account' ? 'returned_after_create' : 'returned_after_sign_in', saved.path);
    window.location.replace(saved.url || saved.path);
  }

  /* --- boot -------------------------------------------------------------- */

  function start() {
    var onGatedPage = PAGES.test(window.location.pathname);
    if (onGatedPage) {
      styles();
      place();
      /* Results re-render on filter, sort and "show more", so keep up. */
      if (typeof MutationObserver === 'function') {
        var pending = false;
        new MutationObserver(function () {
          if (pending) return;
          pending = true;
          setTimeout(function () { pending = false; try { place(); } catch (e) { /* never block */ } }, 250);
        }).observe(document.body, { childList: true, subtree: true });
      }
    }

    /* The return fires ONLY from the account page Revelex lands people on
       after signing in (LANDING). Paul, 2026-09-23: on an older account
       Revelex's forced password-change page was left after about a second,
       because this used to fire on ANY signed-in page. Now every other page
       keeps the saved search; after the new password is saved Revelex goes on
       to the account page and the return fires from there. On the page they
       originally left, signed in, the saved search is simply dropped. */
    if (!readReturn()) return;
    var onLanding = LANDING.test(window.location.pathname);
    if (onLanding && !onPasswordPage()) showReturning();
    var waited = 0;
    var last = null;
    var timer = setInterval(function () {
      waited += 300;
      var s = authState();
      if (s === 'in' && last === 'in') {
        clearInterval(timer);
        if (onLanding) { maybeReturn(); return; }
        var saved = readReturn();
        if (saved && window.location.pathname === saved.path) clearReturn();
        return;
      }
      /* Signed out after all: take the message down and leave them be. */
      if (s === 'out' && last === 'out') { clearInterval(timer); hideReturning(); return; }
      last = s;
      if (waited >= 20000) { clearInterval(timer); hideReturning(); }
    }, 300);
  }

  /* A Back-button return restores the page from cache with the busy label on. */
  window.addEventListener('pageshow', function () {
    var links = document.querySelectorAll('.' + ROOT + ' .is-busy');
    for (var i = 0; i < links.length; i++) {
      links[i].classList.remove('is-busy');
      var label = links[i].querySelector('.' + ROOT + '-label');
      if (label) label.textContent = 'Create account';
    }
  });

  /* FAST PATH on the account page. Revelex serves profile/0/home.html only to
     signed-in visitors (a signed-out request is redirected to login.html,
     verified 2026-09-23), so there is no need to wait for their
     authentication-status call, or for DOMContentLoaded, which sits behind
     their 4 MB bundle. This file is loaded just BEFORE that bundle, so the
     page above us is already parsed: go now. Paul saw the account page for
     seconds before the message under the old wait. The password check still
     holds here because Revelex renders its password fields in the HTML. */
  var early = false;
  try {
    if (LANDING.test(window.location.pathname) && readReturn() && document.body && !onPasswordPage()) {
      early = true;
      maybeReturn();
    }
  } catch (e) { early = false; /* fall back to the normal path below */ }

  if (!early) {
    try { removePrecover(); } catch (e) { /* ignore */ }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { try { start(); } catch (e) { /* never block */ } });
    } else {
      try { start(); } catch (e) { /* never block */ }
    }
  }

  return { start: start, authState: authState };
}());
