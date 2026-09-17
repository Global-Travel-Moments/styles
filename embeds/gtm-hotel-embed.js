/* =====================================================================
   GTM SINGLE-HOTEL BOOKING EMBED - shared behaviour
   ---------------------------------------------------------------------
   Hosted at https://global-travel-moments.github.io/styles/embeds/gtm-hotel-embed.js

   ONE copy of the CSS and the logic for every placement. An embed ships a
   single root element carrying its configuration as data attributes, plus
   a deferred script tag pointing here. A fix made here reaches every
   placement within the 10 minute GitHub Pages cache.

   Sibling of gtm-collection-embed.js. One property, set by
   data-hotel-id, which Webflow can bind to a CMS field.

   Two passes run in order. The first injects the stylesheet once and
   APPENDS the card markup into each root - append, never replace, so a
   Webflow Collection List sitting inside the root survives and can drive
   the hotel list. The second is the component logic, byte-for-byte the
   same as the source embed in GTM/embeds/components/hotel-embed/, which
   stays the editable original. Do not edit the logic here by hand.
   ===================================================================== */

/* ---- pass 1: stylesheet + markup ---- */
(function () {
  var STYLE_ID = 'gtm-shb-css';
  var CSS = ".gtm-shb, .gtm-shb *, .gtm-shb *::before, .gtm-shb *::after { box-sizing: border-box; }\n.gtm-shb {\n--shb-pearl: #FFF9EE;\n--shb-orange: #FF640F;\n--shb-midnight: #0B152D;\n--shb-caribbean: #ADD1CF;\nwidth: 100%;\npadding: 1.75rem 1.5rem;\nfont-family: 'Manrope', system-ui, sans-serif;\ncolor: var(--shb-midnight);\nline-height: 1.5;\n}\n.gtm-shb .shb-card {\nbackground: var(--shb-pearl);\nborder: 1px solid var(--shb-midnight);\nborder-radius: 2em;\npadding: 1.1rem 1.1rem 0.9rem;\nmax-width: 720px;\nmargin: 0 auto;\n}\n.gtm-shb .shb-head { padding: 0 0.4rem 0.75rem; }\n.gtm-shb .shb-name {\nfont-family: 'Instrument Serif', Georgia, serif;\nfont-size: 1.45rem;\nline-height: 1.15;\nmargin: 0;\nfont-weight: 400;\n}\n.gtm-shb .shb-place {\nfont-size: 0.68rem;\ntext-transform: uppercase;\nletter-spacing: 0.09em;\nfont-weight: 700;\nopacity: 0.65;\nmargin-top: 0.3rem;\n}\n.gtm-shb .shb-head.shb-hidden,\n.gtm-shb .shb-name:empty,\n.gtm-shb .shb-place:empty { display: none; }\n.gtm-shb .shb-row {\ndisplay: flex;\ngap: 0.5rem;\nflex-wrap: wrap;\nalign-items: stretch;\n}\n.gtm-shb .shb-field {\nbackground: var(--shb-pearl);\nborder: 1px solid var(--shb-midnight);\nborder-radius: 2em;\npadding: 0.4rem 0.95rem;\ndisplay: flex;\nflex-direction: column;\njustify-content: center;\nmin-height: 44px;\n}\n.gtm-shb .shb-field > label {\nfont-size: 0.58rem;\nfont-weight: 700;\ntext-transform: uppercase;\nletter-spacing: 0.08em;\nopacity: 0.7;\nmargin-bottom: 0.1rem;\n}\n.gtm-shb .shb-field input {\nborder: none;\nbackground: transparent;\nfont-family: inherit;\nfont-size: 0.85rem;\ncolor: var(--shb-midnight);\nwidth: 100%;\npadding: 0;\nmargin: 0;\n}\n.gtm-shb .shb-field input:focus { outline: none; }\n.gtm-shb .shb-field--dates { flex: 1 1 220px; }\n.gtm-shb .shb-dates-inner { display: flex; gap: 0.35rem; align-items: center; }\n.gtm-shb .shb-dates-inner input { flex: 1; min-width: 0; }\n.gtm-shb .shb-dates-inner span { opacity: 0.4; font-size: 0.8rem; }\n.gtm-shb .shb-field--guests { flex: 1 1 245px; }\n.gtm-shb .shb-guests-inner { display: flex; gap: 0.55rem; }\n.gtm-shb .shb-guests-inner > div { display: flex; flex-direction: column; flex: 1; }\n.gtm-shb .shb-guests-inner small {\nfont-size: 0.54rem;\ntext-transform: uppercase;\nletter-spacing: 0.06em;\nopacity: 0.6;\n}\n.gtm-shb .shb-search-btn {\nbackground: var(--shb-orange);\ncolor: var(--shb-pearl);\nborder: 1px solid var(--shb-orange);\nborder-radius: 2em;\nfont-family: 'Manrope', system-ui, sans-serif;\nfont-weight: 700;\nfont-size: 0.72rem;\nletter-spacing: 0.06em;\ntext-transform: uppercase;\npadding: 0.5rem 1.9rem;\ncursor: pointer;\nmargin-left: auto;\ntransition: background 0.18s, border-color 0.18s;\n}\n.gtm-shb .shb-search-btn:hover {\nbackground: var(--shb-midnight);\nborder-color: var(--shb-midnight);\n}\n.gtm-shb .shb-search-btn[disabled] { opacity: 0.65; cursor: default; }\n.gtm-shb .shb-extras {\ndisplay: flex;\nalign-items: center;\ngap: 0.75rem 1rem;\nflex-wrap: wrap;\nmargin-top: 0.7rem;\npadding: 0 0.4rem;\n}\n.gtm-shb .shb-child-ages {\ndisplay: flex;\ngap: 0.4rem;\nflex-wrap: wrap;\nalign-items: center;\n}\n.gtm-shb .shb-child-ages.shb-hidden { display: none; }\n.gtm-shb .shb-child-ages .shb-ca-label {\nfont-size: 0.62rem;\ntext-transform: uppercase;\nletter-spacing: 0.06em;\nopacity: 0.7;\nfont-weight: 700;\n}\n.gtm-shb .shb-child-ages input {\nwidth: 46px;\nborder: 1px solid var(--shb-midnight);\nborder-radius: 1em;\npadding: 0.25rem 0.4rem;\nbackground: var(--shb-pearl);\nfont-family: inherit;\nfont-size: 0.8rem;\ncolor: var(--shb-midnight);\n}\n.gtm-shb .shb-benefits {\nfont-size: 0.74rem;\nfont-weight: 600;\nmargin-top: 0.7rem;\npadding: 0.55rem 0.85rem;\nborder-radius: 1.25em;\nbackground: var(--shb-caribbean);\n}\n.gtm-shb .shb-benefits:empty { display: none; }\n.gtm-shb .shb-note {\nfont-size: 0.72rem;\nopacity: 0.7;\nmargin-top: 0.55rem;\npadding: 0 0.4rem;\n}\n.gtm-shb .shb-note:empty { display: none; }\n.gtm-shb [data-shb-field] { display: none !important; }\n.gtm-shb .shb-error {\ncolor: var(--shb-orange);\nfont-weight: 600;\nfont-size: 0.78rem;\nmin-height: 1.1em;\nmargin-top: 0.4rem;\npadding: 0 0.4rem;\n}\n.gtm-shb .shb-loading {\nfont-size: 0.72rem;\nfont-style: italic;\nopacity: 0;\nmargin-top: 0.2rem;\npadding: 0 0.4rem;\ntransition: opacity 0.2s;\n}\n.gtm-shb .shb-loading.shb-on { opacity: 0.75; }\n.gtm-shb .shb-debug {\ndisplay: none;\nmargin: 0.9rem auto 0;\nmax-width: 720px;\nfont-family: ui-monospace, Menlo, Consolas, monospace;\nfont-size: 0.68rem;\nline-height: 1.5;\nword-break: break-all;\nbackground: var(--shb-midnight);\ncolor: var(--shb-pearl);\npadding: 0.75rem 0.9rem;\nborder-radius: 1em;\n}\n.gtm-shb[data-debug] .shb-debug { display: block; }\n.gtm-shb .shb-debug a { color: var(--shb-caribbean); }\n@media (max-width: 767px) {\n.gtm-shb { padding: 1.25rem 0.85rem; }\n.gtm-shb .shb-card { max-width: none; }\n.gtm-shb .shb-row { flex-direction: column; }\n.gtm-shb .shb-row > .shb-field { flex: 1 1 auto; width: 100%; }\n.gtm-shb .shb-search-btn { width: 100%; margin-left: 0; padding: 0.7rem; }\n.gtm-shb .shb-field input,\n.gtm-shb .shb-child-ages input { font-size: 16px; }\n}\n@media (max-width: 430px) {\n.gtm-shb .shb-dates-inner { flex-direction: column; align-items: stretch; gap: 0.2rem; }\n.gtm-shb .shb-dates-inner span { transform: rotate(90deg); align-self: flex-start; }\n}";
  var MARKUP = "<div class=\"shb-card\"><div class=\"shb-head\"><p class=\"shb-name\" data-shb=\"name\"></p><div class=\"shb-place\" data-shb=\"place\"></div></div><div class=\"shb-row\"><div class=\"shb-field shb-field--dates\"><label>Check-in &middot; Check-out</label><div class=\"shb-dates-inner\"><input type=\"date\" data-shb=\"checkin\" aria-label=\"Check-in\"><span>&rarr;</span><input type=\"date\" data-shb=\"checkout\" aria-label=\"Check-out\"></div></div><div class=\"shb-field shb-field--guests\"><label>Guests &amp; Rooms</label><div class=\"shb-guests-inner\"><div><small>Adults</small><input type=\"number\" data-shb=\"adults\" value=\"2\" min=\"1\" max=\"8\"></div><div><small>Children</small><input type=\"number\" data-shb=\"children\" value=\"0\" min=\"0\" max=\"6\"></div><div><small>Rooms</small><input type=\"number\" data-shb=\"rooms\" value=\"1\" min=\"1\" max=\"4\"></div></div></div></div><div class=\"shb-extras\"><div class=\"shb-child-ages shb-hidden\" data-shb=\"childages\"><span class=\"shb-ca-label\">Children's ages</span></div><button type=\"button\" class=\"shb-search-btn\" data-shb=\"search\">Check rates</button></div><div class=\"shb-loading\" data-shb=\"loading\">Loading live rates, this can take a few seconds&hellip;</div><div class=\"shb-error\" data-shb=\"error\"></div><div class=\"shb-benefits\" data-shb=\"benefits\"></div><div class=\"shb-note\" data-shb=\"note\"></div></div><div class=\"shb-debug\" data-shb=\"debug\"></div>";
  function prep() {
    var roots = document.querySelectorAll('.gtm-shb:not([data-shb-prepped])');
    if (!roots.length) return;
    if (!document.getElementById(STYLE_ID)) {
      var s = document.createElement('style');
      s.id = STYLE_ID; s.textContent = CSS; document.head.appendChild(s);
    }
    Array.prototype.forEach.call(roots, function (root) {
      root.setAttribute('data-shb-prepped', '1');
      root.insertAdjacentHTML('beforeend', MARKUP);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prep);
  } else { prep(); }
})();

/* ---- pass 2: component logic, verbatim from the source embed ---- */
(function () {
  /* Single-property endpoint. search_hotels.html cannot filter by hotel ID -
     it runs an area search - so room_availability.html is the only one that
     lands on a named hotel. clear=all is NOT wanted here. */
  var ENDPOINT = 'https://book.globaltravelmoments.com/app/0/hotel/0/room_availability.html';
  var HATOKEN = 'GTCGTM01';
  var GDS_SOURCE_TYPE = '3';   /* constant tail of the gds_id bracket */

  /* Defaults. Any of these can be overridden per instance with
     data-utm-source / data-utm-medium / data-utm-campaign /
     data-utm-content / data-utm-id on the wrapper div. Set a value to ''
     to drop that parameter.

     utm_source + utm_medium make GA4 start a fresh, credited session on
     the booking site. Keep them for partner placements (OutThere) - that
     is exactly the question being asked. Blank them if you would rather
     preserve the visitor's original acquisition source. */
  var UTM_DEFAULTS = {
    utm_source:   'outthere',
    utm_medium:   'partner',
    utm_campaign: 'outthere-capella',
    utm_content:  '',
    utm_id:       ''
  };

  function enc(key, value) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(value);
  }

  function isoToRevelex(iso) {
    if (!iso) return '';
    var b = iso.split('-');
    return b[1] + '/' + b[2] + '/' + b[0];
  }

  function initHotelBar(root) {
    var q = function (sel) { return root.querySelector(sel); };
    var data = root.dataset;

    /* Webflow cannot bind a CMS field to an attribute, only to element text,
       so the config may arrive as child elements marked data-shb-field.
       Fall back to the wrapper's data- attributes for hand-written embeds. */
    var cfg = function (key, dsKey) {
      var child = root.querySelector('[data-shb-field="' + key + '"]');
      if (child) return (child.textContent || '').trim();
      return (data[dsKey] || '').trim();
    };
    var hotelId = cfg('id', 'hotelId');
    var hotelName = cfg('name', 'hotelName');

    var checkIn = q('[data-shb="checkin"]');
    var checkOut = q('[data-shb="checkout"]');
    var adultsEl = q('[data-shb="adults"]');
    var childrenEl = q('[data-shb="children"]');
    var roomsEl = q('[data-shb="rooms"]');
    var childAgesEl = q('[data-shb="childages"]');
    var errorEl = q('[data-shb="error"]');
    var loadingEl = q('[data-shb="loading"]');
    var searchBtn = q('[data-shb="search"]');
    var debugEl = q('[data-shb="debug"]');

    /* content from data attributes, so Webflow can bind them to CMS fields */
    q('[data-shb="name"]').textContent = hotelName;
    q('[data-shb="place"]').textContent = cfg('place', 'hotelPlace');
    q('[data-shb="benefits"]').textContent = data.benefits || '';
    q('[data-shb="note"]').textContent = cfg('note', 'note');

    var UTM = {};
    Object.keys(UTM_DEFAULTS).forEach(function (key) {
      /* utm_source -> data-utm-source -> dataset.utmSource */
      var dsKey = key.replace(/^utm_(.)/, function (m, c) { return 'utm' + c.toUpperCase(); });
      /* Only utm_content is ever carried as bound text. Deriving the field
         name from the key would map utm_id onto [data-shb-field="id"], which
         is the GDS hotel id, and silently poison the UTM. */
      var asText = key === 'utm_content'
        ? root.querySelector('[data-shb-field="content"]')
        : null;
      if (asText && (asText.textContent || '').trim()) {
        UTM[key] = (asText.textContent || '').trim();
      } else {
        UTM[key] = data[dsKey] !== undefined ? data[dsKey] : UTM_DEFAULTS[key];
      }
    });

    if (!hotelId) {
      errorEl.textContent = 'This booking panel is missing its hotel ID.';
      searchBtn.disabled = true;
      return;
    }

    function renderChildAges() {
      var n = parseInt(childrenEl.value, 10) || 0;
      root.querySelectorAll('.shb-ca-field').forEach(function (e) { e.remove(); });
      if (n <= 0) { childAgesEl.classList.add('shb-hidden'); return; }
      childAgesEl.classList.remove('shb-hidden');
      for (var i = 1; i <= n; i++) {
        var inp = document.createElement('input');
        inp.type = 'number';
        inp.min = '0';
        inp.max = '17';
        inp.value = '8';
        inp.className = 'shb-ca-field';
        inp.setAttribute('aria-label', 'Child ' + i + ' age');
        inp.addEventListener('input', refreshDebug);
        childAgesEl.appendChild(inp);
      }
    }

    function buildURL() {
      var ci = isoToRevelex(checkIn.value);
      var co = isoToRevelex(checkOut.value);
      if (!ci || !co) return null;

      var adults = parseInt(adultsEl.value, 10) || 1;
      var children = parseInt(childrenEl.value, 10) || 0;
      var rooms = parseInt(roomsEl.value, 10) || 1;
      var ages = Array.prototype.map.call(
        root.querySelectorAll('.shb-ca-field'),
        function (e) { return e.value || '8'; }
      );

      var p = [];
      p.push(enc('hatoken', HATOKEN));
      p.push(enc('search[hotel_list][gds_id][' + hotelId + ']', GDS_SOURCE_TYPE));
      p.push(enc('search[check_in_date]', ci));
      p.push(enc('search[check_out_date]', co));
      p.push(enc('number-of-rooms', rooms));

      for (var r = 1; r <= rooms; r++) {
        p.push(enc('search[rooms][' + r + '][number_adults]', adults));
        p.push(enc('search[rooms][' + r + '][number_children]', children));
        ages.forEach(function (age, idx) {
          p.push(enc('search[rooms][' + r + '][children_ages][' + (idx + 1) + ']', age));
        });
      }

      var utmPairs = [];
      Object.keys(UTM).forEach(function (key) {
        if (UTM[key]) utmPairs.push(enc(key, UTM[key]));
      });
      p = p.concat(utmPairs);

      /* Revelex 302s this endpoint on to room_selection.html and drops the
         query string on the way. A fragment survives the redirect, so the
         UTMs are repeated in the hash - that is the copy the booking site
         can actually read. */
      var hash = utmPairs.length ? '#' + utmPairs.join('&') : '';

      return ENDPOINT + '?' + p.join('&') + hash;
    }

    function validate() {
      if (!checkIn.value || !checkOut.value) return 'Pick both check-in and check-out dates.';
      if (checkOut.value <= checkIn.value) return 'Check-out must be after check-in.';
      return '';
    }

    function refreshDebug() {
      if (!root.hasAttribute('data-debug')) return;
      var url = buildURL();
      debugEl.replaceChildren();
      if (!url) { debugEl.textContent = 'Pick dates to build the URL.'; return; }
      var a = document.createElement('a');
      a.href = url;
      a.textContent = url;
      a.target = '_blank';
      a.rel = 'noopener';
      debugEl.appendChild(a);
    }

    searchBtn.addEventListener('click', function () {
      var err = validate();
      errorEl.textContent = err;
      if (err) return;
      var url = buildURL();
      if (!url) return;

      loadingEl.classList.add('shb-on');
      searchBtn.disabled = true;

      /* GA via Google Tag Manager: record the click, then navigate. The
         existing hotel_search trigger and GA4 tag pick this up with no new
         container work; search_type separates it from the area-search bar.
         eventCallback navigates once GTM has fired, setTimeout is the
         fallback if GTM is slow or absent. */
      var navigated = false;
      function go() { if (!navigated) { navigated = true; window.location.href = url; } }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'hotel_search',
        search_term: hotelName || hotelId,
        search_type: 'single_hotel',
        search_hotel_id: hotelId,
        search_campaign: UTM.utm_campaign || '',
        search_placement: UTM.utm_content || '',
        eventCallback: go,
        eventTimeout: 1200
      });
      setTimeout(go, 1200);
    });

    /* --- dates: 30 days out by default, 3-night stay; check-out follows check-in + 3 --- */
    function fmtLocal(d) {
      var mm = ('0' + (d.getMonth() + 1)).slice(-2);
      var dd = ('0' + d.getDate()).slice(-2);
      return d.getFullYear() + '-' + mm + '-' + dd;
    }
    function addDays(iso, n) {
      var p = iso.split('-');
      var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      d.setDate(d.getDate() + n);
      return fmtLocal(d);
    }
    function syncCheckout() {
      if (!checkIn.value) return;
      checkOut.value = addDays(checkIn.value, 3);
      checkOut.min = addDays(checkIn.value, 1);
    }
    var today = new Date();
    var ciDate = new Date();
    ciDate.setDate(ciDate.getDate() + 30);
    checkIn.min = fmtLocal(today);
    checkIn.value = fmtLocal(ciDate);
    syncCheckout();

    checkIn.addEventListener('change', function () { syncCheckout(); refreshDebug(); });
    checkOut.addEventListener('change', refreshDebug);
    childrenEl.addEventListener('input', function () { renderChildAges(); refreshDebug(); });
    adultsEl.addEventListener('input', refreshDebug);
    roomsEl.addEventListener('input', refreshDebug);

    refreshDebug();
  }

  function boot() {
    document.querySelectorAll('.gtm-shb:not([data-shb-ready])').forEach(function (root) {
      root.setAttribute('data-shb-ready', '1');
      initHotelBar(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
