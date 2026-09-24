/* =====================================================================
   GTM MULTI-HOTEL BOOKING EMBED - shared behaviour
   ---------------------------------------------------------------------
   Hosted at https://global-travel-moments.github.io/styles/embeds/gtm-collection-embed.js

   ONE copy of the CSS and the logic for every placement. An embed ships a
   single root element carrying its configuration as data attributes, plus
   a deferred script tag pointing here. A fix made here reaches every
   placement within the 10 minute GitHub Pages cache.

   Sibling of gtm-hotel-embed.js. That one is ONE property; this one
   lets the visitor pick from a list first, then set dates.

   Two passes run in order. The first injects the stylesheet once and
   APPENDS the card markup into each root - append, never replace, so a
   Webflow Collection List sitting inside the root survives and can drive
   the hotel list. The second is the component logic, byte-for-byte the
   same as the source embed in GTM/embeds/components/hotel-embed/, which
   stays the editable original. Do not edit the logic here by hand.
   ===================================================================== */

/* ---- pass 1: stylesheet + markup ---- */
(function () {
  var STYLE_ID = 'gtm-mhb-css';
  var CSS = ".gtm-mhb, .gtm-mhb *, .gtm-mhb *::before, .gtm-mhb *::after { box-sizing: border-box; }\n.gtm-mhb {\n--mhb-pearl: #FFF9EE;\n--mhb-orange: #FF640F;\n--mhb-midnight: #0B152D;\n--mhb-caribbean: #ADD1CF;\nwidth: 100%;\npadding: 1.75rem 1.5rem;\nfont-family: 'Manrope', system-ui, sans-serif;\ncolor: var(--mhb-midnight);\nline-height: 1.5;\n}\n.gtm-mhb .mhb-card {\nbackground: var(--mhb-pearl);\nborder: 1px solid var(--mhb-midnight);\nborder-radius: 2em;\npadding: 1.1rem 1.1rem 0.9rem;\nmax-width: 720px;\nmargin: 0 auto;\n}\n.gtm-mhb .mhb-head { padding: 0 0.4rem 0.75rem; }\n.gtm-mhb .mhb-heading {\nfont-family: 'Instrument Serif', Georgia, serif;\nfont-size: 1.45rem;\nline-height: 1.15;\nmargin: 0;\nfont-weight: 400;\n}\n.gtm-mhb .mhb-heading:empty { display: none; }\n.gtm-mhb .mhb-head:has(.mhb-heading:empty) { display: none; }\n.gtm-mhb .mhb-pick { padding: 0 0.4rem 0.8rem; }\n.gtm-mhb .mhb-pick-label {\nfont-size: 0.58rem;\nfont-weight: 700;\ntext-transform: uppercase;\nletter-spacing: 0.08em;\nopacity: 0.7;\nmargin-bottom: 0.45rem;\n}\n.gtm-mhb .mhb-pills {\ndisplay: flex;\nflex-wrap: wrap;\ngap: 0.4rem;\n}\n.gtm-mhb .mhb-pill { position: relative; }\n.gtm-mhb .mhb-pill input {\nposition: absolute;\nopacity: 0;\nwidth: 1px;\nheight: 1px;\nmargin: 0;\n}\n.gtm-mhb .mhb-pill > span {\ndisplay: flex;\nflex-direction: column;\njustify-content: center;\nborder: 1px solid var(--mhb-midnight);\nborder-radius: 2em;\npadding: 0.42rem 0.95rem;\ncursor: pointer;\nmin-height: 44px;\nheight: 100%;\ntransition: background 0.18s, color 0.18s, border-color 0.18s;\n}\n.gtm-mhb .mhb-pill-name {\nfont-size: 0.82rem;\nfont-weight: 700;\nline-height: 1.15;\n}\n.gtm-mhb .mhb-pill-place {\nfont-size: 0.58rem;\ntext-transform: uppercase;\nletter-spacing: 0.07em;\nfont-weight: 700;\nopacity: 0.6;\nmargin-top: 0.12rem;\n}\n.gtm-mhb .mhb-pill-place:empty { display: none; }\n.gtm-mhb .mhb-pill > span:hover { background: var(--mhb-caribbean); }\n.gtm-mhb .mhb-pill input:checked + span {\nbackground: var(--mhb-midnight);\nborder-color: var(--mhb-midnight);\ncolor: var(--mhb-pearl);\n}\n.gtm-mhb .mhb-pill input:checked + span .mhb-pill-place { opacity: 0.75; }\n.gtm-mhb .mhb-pill input:focus-visible + span {\noutline: 2px solid var(--mhb-orange);\noutline-offset: 2px;\n}\n.gtm-mhb .mhb-pill--unbookable > span {\nborder-style: dashed;\nopacity: 0.72;\n}\n.gtm-mhb .mhb-pill--unbookable input:checked + span {\nbackground: var(--mhb-pearl);\nborder-color: var(--mhb-orange);\nborder-style: dashed;\ncolor: var(--mhb-midnight);\n}\n.gtm-mhb .mhb-pill--unbookable .mhb-pill-place { color: var(--mhb-orange); opacity: 1; }\n.gtm-mhb .mhb-options { display: none; }\n.gtm-mhb [data-mhb-field] { display: none !important; }\n.gtm-mhb .mhb-row {\ndisplay: flex;\ngap: 0.5rem;\nflex-wrap: wrap;\nalign-items: stretch;\n}\n.gtm-mhb .mhb-field {\nbackground: var(--mhb-pearl);\nborder: 1px solid var(--mhb-midnight);\nborder-radius: 2em;\npadding: 0.4rem 0.95rem;\ndisplay: flex;\nflex-direction: column;\njustify-content: center;\nmin-height: 44px;\n}\n.gtm-mhb .mhb-field > label {\nfont-size: 0.58rem;\nfont-weight: 700;\ntext-transform: uppercase;\nletter-spacing: 0.08em;\nopacity: 0.7;\nmargin-bottom: 0.1rem;\n}\n.gtm-mhb .mhb-field input {\nborder: none;\nbackground: transparent;\nfont-family: inherit;\nfont-size: 0.85rem;\ncolor: var(--mhb-midnight);\nwidth: 100%;\npadding: 0;\nmargin: 0;\n}\n.gtm-mhb .mhb-field input:focus { outline: none; }\n.gtm-mhb .mhb-field--dates { flex: 1 1 220px; }\n.gtm-mhb .mhb-dates-inner { display: flex; gap: 0.35rem; align-items: center; }\n.gtm-mhb .mhb-dates-inner input { flex: 1; min-width: 0; }\n.gtm-mhb .mhb-dates-inner span { opacity: 0.4; font-size: 0.8rem; }\n.gtm-mhb .mhb-field--guests { flex: 1 1 245px; }\n.gtm-mhb .mhb-guests-inner { display: flex; gap: 0.55rem; }\n.gtm-mhb .mhb-guests-inner > div { display: flex; flex-direction: column; flex: 1; }\n.gtm-mhb .mhb-guests-inner small {\nfont-size: 0.54rem;\ntext-transform: uppercase;\nletter-spacing: 0.06em;\nopacity: 0.6;\n}\n.gtm-mhb .mhb-search-btn {\nbackground: var(--mhb-orange);\ncolor: var(--mhb-pearl);\nborder: 1px solid var(--mhb-orange);\nborder-radius: 2em;\nfont-family: 'Manrope', system-ui, sans-serif;\nfont-weight: 700;\nfont-size: 0.72rem;\nletter-spacing: 0.06em;\ntext-transform: uppercase;\npadding: 0.5rem 1.9rem;\ncursor: pointer;\nmargin-left: auto;\ntransition: background 0.18s, border-color 0.18s;\n}\n.gtm-mhb .mhb-search-btn:hover {\nbackground: var(--mhb-midnight);\nborder-color: var(--mhb-midnight);\n}\n.gtm-mhb .mhb-search-btn[disabled] { opacity: 0.65; cursor: default; }\n.gtm-mhb .mhb-extras {\ndisplay: flex;\nalign-items: center;\ngap: 0.75rem 1rem;\nflex-wrap: wrap;\nmargin-top: 0.7rem;\npadding: 0 0.4rem;\n}\n.gtm-mhb .mhb-child-ages {\ndisplay: flex;\ngap: 0.4rem;\nflex-wrap: wrap;\nalign-items: center;\n}\n.gtm-mhb .mhb-child-ages.mhb-hidden { display: none; }\n.gtm-mhb .mhb-child-ages .mhb-ca-label {\nfont-size: 0.62rem;\ntext-transform: uppercase;\nletter-spacing: 0.06em;\nopacity: 0.7;\nfont-weight: 700;\n}\n.gtm-mhb .mhb-child-ages input {\nwidth: 46px;\nborder: 1px solid var(--mhb-midnight);\nborder-radius: 1em;\npadding: 0.25rem 0.4rem;\nbackground: var(--mhb-pearl);\nfont-family: inherit;\nfont-size: 0.8rem;\ncolor: var(--mhb-midnight);\n}\n.gtm-mhb .mhb-benefits {\nfont-size: 0.74rem;\nfont-weight: 600;\nmargin-top: 0.7rem;\npadding: 0.55rem 0.85rem;\nborder-radius: 1.25em;\nbackground: var(--mhb-caribbean);\n}\n.gtm-mhb .mhb-benefits:empty { display: none; }\n.gtm-mhb .mhb-note {\nfont-size: 0.72rem;\nopacity: 0.7;\nmargin-top: 0.55rem;\npadding: 0 0.4rem;\n}\n.gtm-mhb .mhb-note:empty { display: none; }\n.gtm-mhb .mhb-error {\ncolor: var(--mhb-orange);\nfont-weight: 600;\nfont-size: 0.78rem;\nmin-height: 1.1em;\nmargin-top: 0.4rem;\npadding: 0 0.4rem;\n}\n.gtm-mhb .mhb-loading {\nfont-size: 0.72rem;\nfont-style: italic;\nopacity: 0;\nmargin-top: 0.2rem;\npadding: 0 0.4rem;\ntransition: opacity 0.2s;\n}\n.gtm-mhb .mhb-loading.mhb-on { opacity: 0.75; }\n.gtm-mhb .mhb-debug {\ndisplay: none;\nmargin: 0.9rem auto 0;\nmax-width: 720px;\nfont-family: ui-monospace, Menlo, Consolas, monospace;\nfont-size: 0.68rem;\nline-height: 1.5;\nword-break: break-all;\nbackground: var(--mhb-midnight);\ncolor: var(--mhb-pearl);\npadding: 0.75rem 0.9rem;\nborder-radius: 1em;\n}\n.gtm-mhb[data-debug] .mhb-debug { display: block; }\n.gtm-mhb .mhb-debug a { color: var(--mhb-caribbean); }\n@media (max-width: 767px) {\n.gtm-mhb { padding: 1.25rem 0.85rem; }\n.gtm-mhb .mhb-card { max-width: none; }\n.gtm-mhb .mhb-row { flex-direction: column; }\n.gtm-mhb .mhb-row > .mhb-field { flex: 1 1 auto; width: 100%; }\n.gtm-mhb .mhb-search-btn { width: 100%; margin-left: 0; padding: 0.7rem; }\n.gtm-mhb .mhb-pills { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }\n.gtm-mhb .mhb-field input,\n.gtm-mhb .mhb-child-ages input { font-size: 16px; }\n}\n@media (max-width: 430px) {\n.gtm-mhb .mhb-dates-inner { flex-direction: column; align-items: stretch; gap: 0.2rem; }\n.gtm-mhb .mhb-dates-inner span { transform: rotate(90deg); align-self: flex-start; }\n}\n@media (max-width: 379px) {\n.gtm-mhb .mhb-pills { grid-template-columns: 1fr; }\n}\n.gtm-mhb .mhb-pill > span { text-align: center; align-items: center; }\n.gtm-mhb .mhb-field--guests { border: 0; background: transparent; padding: 0; }\n.gtm-mhb .mhb-field--guests > label { display: none; }\n.gtm-mhb .mhb-guests-inner {\ndisplay: grid;\ngrid-template-columns: repeat(3, 1fr);\ngap: 0.5rem;\n}\n.gtm-mhb .mhb-guests-inner > div {\nborder: 1px solid var(--mhb-midnight);\nborder-radius: 1.05rem;\nbackground: var(--mhb-pearl);\npadding: 0.4rem 0.6rem;\ntext-align: center;\n}\n.gtm-mhb .mhb-guests-inner input { text-align: center; width: 100%; }\n.gtm-mhb .mhb-pick-label { display: none; }\n.gtm-mhb .mhb-dates-inner input[type=\"date\"] { position: relative; padding-left: 24px; }\n.gtm-mhb .mhb-dates-inner input[type=\"date\"]::-webkit-calendar-picker-indicator {\nposition: absolute; left: 0; top: 50%; transform: translateY(-50%);\nmargin: 0; padding: 0; cursor: pointer; opacity: 0.85;\n}\n.gtm-mhb .mhb-dates-inner input[type=\"date\"]::-webkit-calendar-picker-indicator:hover { opacity: 1; }\n.gtm-mhb[data-mhb-layout=\"panel\"] { display: flex; justify-content: center; }\n.gtm-mhb[data-mhb-layout=\"panel\"] .mhb-card {\nwidth: 100%;\nmax-width: 560px;\ntext-align: center;\npadding-top: 2.25rem;\npadding-bottom: 0.5rem;\n}\n.gtm-mhb[data-mhb-layout=\"panel\"] .mhb-pills {\ndisplay: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;\n}\n.gtm-mhb[data-mhb-layout=\"panel\"] .mhb-search-btn { margin-left: auto; margin-right: auto; }\n.gtm-mhb[data-mhb-layout=\"wide\"] .mhb-card {\nmax-width: 100%;\ntext-align: center;\npadding-bottom: 0.5rem;\n}\n.gtm-mhb[data-mhb-layout=\"wide\"] .mhb-pills {\ndisplay: grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem;\n}\n.gtm-mhb[data-mhb-layout=\"wide\"] .mhb-search-btn { margin-left: auto; margin-right: auto; }\n@media (max-width: 1100px) {\n.gtm-mhb[data-mhb-layout=\"wide\"] .mhb-pills { grid-template-columns: repeat(3, 1fr); }\n}\n@media (max-width: 767px) {\n.gtm-mhb[data-mhb-layout=\"panel\"] .mhb-pills,\n.gtm-mhb[data-mhb-layout=\"wide\"] .mhb-pills { grid-template-columns: repeat(2, 1fr); }\n}\n.gtm-mhb .mhb-search-btn { text-transform: uppercase; letter-spacing: 0.06em; }";
  var MARKUP = "<div class=\"mhb-card\"><div class=\"mhb-head\"><p class=\"mhb-heading\" data-mhb=\"heading\"></p></div><!-- SOURCE 1: the Webflow Collection List goes in here. Hidden by CSS. --><div class=\"mhb-options\" data-mhb=\"options\"></div><div class=\"mhb-pick\"><div class=\"mhb-pick-label\">Choose a hotel</div><div class=\"mhb-pills\" data-mhb=\"pills\" role=\"radiogroup\" aria-label=\"Choose a hotel\"></div></div><div class=\"mhb-row\"><div class=\"mhb-field mhb-field--dates\"><label>Check-in &middot; Check-out</label><div class=\"mhb-dates-inner\"><input type=\"date\" data-mhb=\"checkin\" aria-label=\"Check-in\"><span>&rarr;</span><input type=\"date\" data-mhb=\"checkout\" aria-label=\"Check-out\"></div></div><div class=\"mhb-field mhb-field--guests\"><label>Guests &amp; Rooms</label><div class=\"mhb-guests-inner\"><div><small>Adults</small><input type=\"number\" data-mhb=\"adults\" value=\"2\" min=\"1\" max=\"8\"></div><div><small>Children</small><input type=\"number\" data-mhb=\"children\" value=\"0\" min=\"0\" max=\"6\"></div><div><small>Rooms</small><input type=\"number\" data-mhb=\"rooms\" value=\"1\" min=\"1\" max=\"4\"></div></div></div></div><div class=\"mhb-extras\"><div class=\"mhb-child-ages mhb-hidden\" data-mhb=\"childages\"><span class=\"mhb-ca-label\">Children's ages</span></div><button type=\"button\" class=\"mhb-search-btn\" data-mhb=\"search\">Reserve your stay</button></div><div class=\"mhb-loading\" data-mhb=\"loading\">Loading live rates, this can take a few seconds&hellip;</div><div class=\"mhb-error\" data-mhb=\"error\"></div><div class=\"mhb-benefits\" data-mhb=\"benefits\"></div><div class=\"mhb-note\" data-mhb=\"note\"></div></div><div class=\"mhb-debug\" data-mhb=\"debug\"></div>";
  function prep() {
    var roots = document.querySelectorAll('.gtm-mhb:not([data-mhb-prepped])');
    if (!roots.length) return;
    if (!document.getElementById(STYLE_ID)) {
      var s = document.createElement('style');
      s.id = STYLE_ID; s.textContent = CSS; document.head.appendChild(s);
    }
    Array.prototype.forEach.call(roots, function (root) {
      root.setAttribute('data-mhb-prepped', '1');
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

  var UTM_DEFAULTS = {
    utm_source:   'outthere',
    utm_medium:   'partner',
    utm_campaign: 'outthere-capella',
    utm_content:  '',
    utm_id:       ''
  };

  var instanceSeq = 0;   /* radio groups need unique names per instance */

  function enc(key, value) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(value);
  }

  /* WHERE THE VISITOR REALLY CAME FROM (Capella review item D2, 2026-09-24).
     The configured UTMs say outthere, which is only true when this embed sits
     on OutThere's own site. On our own pages that labelled every Google,
     Meta, newsletter and direct visitor as OutThere. So on our own hosts the
     link carries the visitor's inbound source instead: their landing UTMs
     (remembered for the tab, so the hub -> hotel page hop keeps them), else
     the external site that referred them, else gtm-website / referral.
     Campaign and content stay as configured unless the inbound link set them.
     On any other host (OutThere) the configured values stand untouched.
     The dataLayer push keeps the CONFIGURED campaign and placement: those
     describe this placement, not the visitor. */
  var OWN_HOST = /(^|\.)globaltravelmoments\.com$|\.webflow\.io$/;
  var INBOUND_KEY = 'gtm_inbound';
  var SEARCH_ENGINE = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|baidu|yandex)\./;

  function inbound() {
    var host = window.location.hostname;
    if (!OWN_HOST.test(host)) return null;
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id'];
    var got = {}, any = false;
    var qs = window.location.search.slice(1).split('&');
    for (var i = 0; i < qs.length; i++) {
      var kv = qs[i].split('=');
      if (keys.indexOf(kv[0]) === -1 || !kv[1]) continue;
      try { got[kv[0]] = decodeURIComponent(kv[1].replace(/\+/g, ' ')); any = true; } catch (e) { /* skip */ }
    }
    try {
      if (any) {
        window.sessionStorage.setItem(INBOUND_KEY, JSON.stringify(got));
        return got;
      }
      var saved = JSON.parse(window.sessionStorage.getItem(INBOUND_KEY) || 'null');
      if (saved && saved.utm_source) return saved;
    } catch (e) { /* storage blocked: fall through */ }
    var ref = '';
    try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) { ref = ''; }
    if (ref && !OWN_HOST.test(ref)) {
      var r = { utm_source: ref.replace(/^www\./, ''), utm_medium: SEARCH_ENGINE.test(ref) ? 'organic' : 'referral' };
      try { window.sessionStorage.setItem(INBOUND_KEY, JSON.stringify(r)); } catch (e) { /* ignore */ }
      return r;
    }
    return { utm_source: 'gtm-website', utm_medium: 'referral' };
  }

  function withInbound(utm) {
    var out = {};
    Object.keys(utm).forEach(function (key) { out[key] = utm[key]; });
    var inb = inbound();
    if (inb) Object.keys(inb).forEach(function (key) { if (inb[key]) out[key] = inb[key]; });
    return out;
  }

  /* Remember the inbound source on ARRIVAL, not only on the Reserve click, so a
     visitor who lands on the hub from an OutThere link and books from a hotel
     page still carries it. */
  try { inbound(); } catch (e) { /* never block the embed */ }

  function isoToRevelex(iso) {
    if (!iso) return '';
    var b = iso.split('-');
    return b[1] + '/' + b[2] + '/' + b[0];
  }

  /* Read the hotel list: CMS-emitted tags first, then the JSON attribute.
     A hotel with no id is dropped rather than rendered as a dead pill. */
  function readHotels(root, data) {
    var list = [];

    Array.prototype.forEach.call(
      root.querySelectorAll('[data-mhb-hotel]'),
      function (el) {
        /* Two ways to hand us a value, checked in this order.
           1. Child elements carrying it as TEXT, marked data-mhb-field. This is
              the Webflow route: its Data API can bind a CMS field to an
              element's text but NOT to an attribute, so a Collection List
              cannot write data-id. Measured 2026-09-17 - attribute bindings
              are rejected with "value must be a string or a binding", and the
              {{wf}} token syntax renders literally inside an HTML Embed.
           2. Plain data- attributes, for a hand-written embed. */
        var field = function (key, attr) {
          var child = el.querySelector('[data-mhb-field="' + key + '"]');
          if (child) return (child.textContent || '').trim();
          return (el.getAttribute(attr) || '').trim();
        };
        list.push({
          id:      field('id', 'data-id'),
          name:    field('name', 'data-name'),
          place:   field('place', 'data-place'),
          content: field('content', 'data-content')
        });
      }
    );

    if (!list.length && data.hotels) {
      try {
        var parsed = JSON.parse(data.hotels);
        if (Array.isArray(parsed)) {
          parsed.forEach(function (h) {
            list.push({
              id:      String(h.id || '').trim(),
              name:    String(h.name || '').trim(),
              place:   String(h.place || '').trim(),
              content: String(h.content || '').trim()
            });
          });
        }
      } catch (e) {
        /* malformed JSON must not take the page down - surfaced below */
      }
    }

    /* An id-less property is kept, not dropped: it still belongs in the
       collection and should be visible. It is flagged unbookable so the
       pill renders in an enquiry state and can never build a deeplink
       with an empty hotel id. Capella Kyoto is the live example. */
    return list.filter(function (h) { return h.id || h.name; })
               .map(function (h) { h.bookable = !!h.id; return h; });
  }

  function initCollectionBar(root) {
    var q = function (sel) { return root.querySelector(sel); };
    var data = root.dataset;

    var checkIn = q('[data-mhb="checkin"]');
    var checkOut = q('[data-mhb="checkout"]');
    var adultsEl = q('[data-mhb="adults"]');
    var childrenEl = q('[data-mhb="children"]');
    var roomsEl = q('[data-mhb="rooms"]');
    var childAgesEl = q('[data-mhb="childages"]');
    var errorEl = q('[data-mhb="error"]');
    var loadingEl = q('[data-mhb="loading"]');
    var searchBtn = q('[data-mhb="search"]');
    var debugEl = q('[data-mhb="debug"]');
    var pillsEl = q('[data-mhb="pills"]');
    var pickEl = root.querySelector('.mhb-pick');

    /* content from data attributes, so Webflow can bind them to CMS fields */
    q('[data-mhb="heading"]').textContent = (data.heading || '').trim();
    q('[data-mhb="benefits"]').innerHTML = data.benefits || '';
    q('[data-mhb="note"]').textContent = data.note || '';

    var UTM = {};
    Object.keys(UTM_DEFAULTS).forEach(function (key) {
      /* utm_source -> data-utm-source -> dataset.utmSource */
      var dsKey = key.replace(/^utm_(.)/, function (m, c) { return 'utm' + c.toUpperCase(); });
      UTM[key] = data[dsKey] !== undefined ? data[dsKey] : UTM_DEFAULTS[key];
    });

    var hotels = readHotels(root, data);

    if (!hotels.length) {
      /* nothing to pick from: hide the picker and the perks rather than
         leaving a dead 'Choose a hotel' label over an empty row */
      pickEl.style.display = 'none';
      q('[data-mhb="benefits"]').innerHTML = '';
      errorEl.textContent = 'This booking panel has no hotels to show.';
      searchBtn.disabled = true;
      return;
    }

    /* --- build the pills --- */
    var groupName = 'mhb-hotel-' + (++instanceSeq);
    var preselect = (data.preselect || '').trim();
    var selected = null;

    hotels.forEach(function (hotel, i) {
      var label = document.createElement('label');
      label.className = 'mhb-pill';

      var input = document.createElement('input');
      input.type = 'radio';
      input.name = groupName;
      input.value = hotel.id;

      var box = document.createElement('span');

      var nameEl = document.createElement('span');
      nameEl.className = 'mhb-pill-name';
      nameEl.textContent = hotel.name || hotel.id;

      var placeEl = document.createElement('span');
      placeEl.className = 'mhb-pill-place';
      placeEl.textContent = hotel.bookable ? hotel.place : 'Enquire only';
      if (!hotel.bookable) { label.classList.add('mhb-pill--unbookable'); }

      box.appendChild(nameEl);
      box.appendChild(placeEl);
      label.appendChild(input);
      label.appendChild(box);
      pillsEl.appendChild(label);

      var isDefault = (!hotel.bookable || preselect === 'none')
        ? false
        : (preselect ? preselect === hotel.id : i === 0);

      if (isDefault) { input.checked = true; selected = hotel; }

      input.addEventListener('change', function () {
        if (!input.checked) return;
        selected = hotel;
        if (hotel.bookable) {
          errorEl.textContent = '';
          searchBtn.disabled = false;
        } else {
          /* no live rates for this one - say so rather than fail silently */
          errorEl.textContent = (data.unbookableNote || '').trim() ||
            (hotel.name + ' cannot be booked online yet. Speak to us and we will arrange it.');
          searchBtn.disabled = true;
        }
        refreshDebug();
      });
    });

    /* One hotel is not a choice - drop the picker and behave like the
       single-hotel embed. Happens when five of six are unbookable. */
    if (hotels.length === 1) {
      pickEl.style.display = 'none';
      selected = hotels[0];
    }

    function renderChildAges() {
      var n = parseInt(childrenEl.value, 10) || 0;
      root.querySelectorAll('.mhb-ca-field').forEach(function (e) { e.remove(); });
      if (n <= 0) { childAgesEl.classList.add('mhb-hidden'); return; }
      childAgesEl.classList.remove('mhb-hidden');
      for (var i = 1; i <= n; i++) {
        var inp = document.createElement('input');
        inp.type = 'number';
        inp.min = '0';
        inp.max = '17';
        inp.value = '8';
        inp.className = 'mhb-ca-field';
        inp.setAttribute('aria-label', 'Child ' + i + ' age');
        inp.addEventListener('input', refreshDebug);
        childAgesEl.appendChild(inp);
      }
    }

    function buildURL() {
      if (!selected || !selected.id) return null;
      var ci = isoToRevelex(checkIn.value);
      var co = isoToRevelex(checkOut.value);
      if (!ci || !co) return null;

      var adults = parseInt(adultsEl.value, 10) || 1;
      var children = parseInt(childrenEl.value, 10) || 0;
      var rooms = parseInt(roomsEl.value, 10) || 1;
      var ages = Array.prototype.map.call(
        root.querySelectorAll('.mhb-ca-field'),
        function (e) { return e.value || '8'; }
      );

      var p = [];
      p.push(enc('hatoken', HATOKEN));
      p.push(enc('search[hotel_list][gds_id][' + selected.id + ']', GDS_SOURCE_TYPE));
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

      /* utm_content identifies WHICH property was chosen, so per-property
         reporting works off one embed. An explicit data-utm-content on the
         wrapper still wins, for a placement that needs its own label. */
      var utmNow = {};
      Object.keys(UTM).forEach(function (key) { utmNow[key] = UTM[key]; });
      if (!utmNow.utm_content) utmNow.utm_content = selected.content || '';
      utmNow = withInbound(utmNow);

      var utmPairs = [];
      Object.keys(utmNow).forEach(function (key) {
        if (utmNow[key]) utmPairs.push(enc(key, utmNow[key]));
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
      if (!selected) return 'Choose a hotel first.';
      if (!selected.id) return (data.unbookableNote || '').trim() ||
        (selected.name + ' cannot be booked online yet. Speak to us and we will arrange it.');
      if (!checkIn.value || !checkOut.value) return 'Pick both check-in and check-out dates.';
      if (checkOut.value <= checkIn.value) return 'Check-out must be after check-in.';
      return '';
    }

    function refreshDebug() {
      if (!root.hasAttribute('data-debug')) return;
      var url = buildURL();
      debugEl.replaceChildren();
      if (!url) { debugEl.textContent = 'Choose a hotel and dates to build the URL.'; return; }
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

      loadingEl.classList.add('mhb-on');
      searchBtn.disabled = true;

      /* GA via Google Tag Manager: record the click, then navigate. The
         existing hotel_search trigger and GA4 tag pick this up with no new
         container work; search_type separates it from the single-hotel
         embed and the area-search bar, and search_hotel_id carries the
         chosen property so per-property reporting still splits cleanly.
         eventCallback navigates once GTM has fired, setTimeout is the
         fallback if GTM is slow or absent. */
      var navigated = false;
      function go() { if (!navigated) { navigated = true; window.location.href = url; } }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'hotel_search',
        search_term: selected.name || selected.id,
        search_type: 'collection_multi',
        search_hotel_id: selected.id,
        search_campaign: UTM.utm_campaign || '',
        search_placement: UTM.utm_content || selected.content || '',
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
    document.querySelectorAll('.gtm-mhb:not([data-mhb-ready])').forEach(function (root) {
      root.setAttribute('data-mhb-ready', '1');
      initCollectionBar(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
