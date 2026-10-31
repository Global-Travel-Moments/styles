/* =====================================================================
   GTM GOOGLE REVIEWS - shared behaviour, styles and layouts
   ---------------------------------------------------------------------
   Hosted at https://global-travel-moments.github.io/styles/embeds/gtm-reviews.js
   Reads     https://global-travel-moments.github.io/styles/embeds/gtm-reviews.json

   ONE copy of the reviews for every placement, on the Webflow site and
   the booking site alike. An embed is an empty div plus a <script src>;
   it carries no review text, no ratings and no CSS. A new review goes
   into gtm-reviews.json once and every placement shows it within the
   10 minute GitHub Pages cache. Do not put review data back into an embed.

   HOW AN EMBED OPTS IN
   --------------------
     <div data-gtm-reviews="carousel"            carousel | rail | strip
          data-gtmr-theme="midnight"             carousel only: midnight (default) | pearl
          data-gtmr-heading="What our travellers say"   carousel only; "none" hides it
          data-gtmr-listing="london"             optional: london | new-york (default both)
          data-gtmr-limit="9"></div>             optional: newest N (default all)
     <script src="https://global-travel-moments.github.io/styles/embeds/gtm-reviews.js" defer></script>

   Several embeds can share a page; the script can be included more than
   once and only runs once.

   THE RULES THIS FILE KEEPS (from the August build, see the Brain note
   project_gtm-google-reviews-embed):
   - Review text is verbatim from Google, typos included.
   - Every review links only to the listing it actually appears on. No
     fallback URL: a New York review must never open the London listing.
   - Each listing shows its OWN rating. No combined figure, no review
     counts, ever.
   - Anything missing degrades to showing less, never to something
     invented. If the data cannot load, the embed stays empty.

   The older self-contained embeds (gtmgr-, gtmcr-) are untouched by this
   file and keep working until they are re-pasted.
   ===================================================================== */
(function () {
  if (window.GTMReviews) { window.GTMReviews.mount(); return; }

  var SCRIPT = document.currentScript;
  var BASE = SCRIPT && SCRIPT.src
    ? SCRIPT.src.replace(/[^\/]*$/, '')
    : 'https://global-travel-moments.github.io/styles/embeds/';
  var DATA_URL = BASE + 'gtm-reviews.json';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var STAR_PATH = 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';
  var EXT_PATH = 'M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM5 5h5V3H3v18h18v-7h-2v5H5V5z';
  var PREV_PATH = 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z';
  var NEXT_PATH = 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z';
  var GOOGLE_G = [
    ['#EA4335', 'M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'],
    ['#4285F4', 'M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'],
    ['#FBBC05', 'M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'],
    ['#34A853', 'M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z']
  ];
  var AVATAR_COLOURS = ['#1a73e8', '#c5221f', '#188038', '#e37400', '#7b1fa2', '#00697d', '#c2185b', '#5d4037'];
  var RAIL_TRUNCATE_AT = 220;
  var STRIP_AUTOPLAY_MS = 6000;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- small helpers ---------- */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function svg(viewBox, d, fill, className) {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', viewBox);
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    if (className) s.setAttribute('class', className);
    var p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', fill);
    s.appendChild(p);
    return s;
  }
  function googleG(className) {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', '0 0 48 48');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('class', className);
    GOOGLE_G.forEach(function (pair) {
      var p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', pair[1]);
      p.setAttribute('fill', pair[0]);
      s.appendChild(p);
    });
    return s;
  }
  /* Google-look stars: yellow filled, grey empty */
  function googleStars(filled, sizeClass) {
    var wrap = el('span', 'gtmr-gstars ' + sizeClass);
    wrap.setAttribute('aria-hidden', 'true');
    for (var i = 1; i <= 5; i++) wrap.appendChild(svg('0 0 24 24', STAR_PATH, i <= filled ? '#fbbc04' : '#dadce0'));
    return wrap;
  }
  /* GTM-look stars: orange text stars, as on the booking site */
  function gtmStars(filled) {
    var wrap = el('span', 'gtmr-stars');
    wrap.setAttribute('role', 'img');
    wrap.setAttribute('aria-label', filled + ' out of 5 stars');
    for (var i = 1; i <= 5; i++) wrap.appendChild(el('span', i <= filled ? '' : 'is-off', '★'));
    return wrap;
  }
  function link(href, className) {
    var a = el('a', className);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }
  function avatarColour(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
  }
  function initial(name) { return (String(name).trim().charAt(0) || '?').toUpperCase(); }

  /* Relative date in Google's own coarse wording ("3 months ago"). */
  function when(iso) {
    if (!iso) return '';
    var days = Math.floor((Date.now() - new Date(iso + 'T12:00:00Z').getTime()) / 86400000);
    if (days < 1) return 'today';
    if (days < 2) return 'a day ago';
    if (days < 7) return days + ' days ago';
    if (days < 14) return 'a week ago';
    if (days < 30) return Math.floor(days / 7) + ' weeks ago';
    var months = Math.round(days / 30.44);
    if (months < 2) return 'a month ago';
    if (months < 12) return months + ' months ago';
    var years = Math.floor(days / 365.25);
    return years < 2 ? 'a year ago' : years + ' years ago';
  }

  /* ---------- data ---------- */
  var dataPromise = null;
  function loadData() {
    if (!dataPromise) {
      dataPromise = fetch(DATA_URL, { credentials: 'omit' })
        .then(function (r) { if (!r.ok) throw new Error('reviews ' + r.status); return r.json(); });
    }
    return dataPromise;
  }

  /* Only reviews whose listing exists in the data, with text and a rating.
     A review with no listing has nowhere honest to link, so it is dropped. */
  function pick(data, root) {
    var listings = {};
    (data.listings || []).forEach(function (l) { if (l.id && l.url && l.rating) listings[l.id] = l; });
    var only = root.getAttribute('data-gtmr-listing');
    var limit = parseInt(root.getAttribute('data-gtmr-limit'), 10);
    var reviews = (data.reviews || []).filter(function (r) {
      return listings[r.listing] && r.text && String(r.text).trim() && r.name && r.stars &&
        (!only || r.listing === only);
    }).slice().sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
    if (limit > 0) reviews = reviews.slice(0, limit);
    var shown = (data.listings || []).filter(function (l) { return listings[l.id] && (!only || l.id === only); });
    return { listings: listings, shownListings: shown, reviews: reviews };
  }

  /* ---------- styles, injected once ---------- */
  var CSS = [
    /* shared */
    '[data-gtm-reviews]{display:block}',
    '[data-gtm-reviews]:empty{display:none}',
    '.gtmr,.gtmr *,.gtmr *::before,.gtmr *::after{box-sizing:border-box}',
    '.gtmr button{font:inherit;text-transform:none;letter-spacing:normal;box-shadow:none;min-height:0;min-width:0;line-height:1}',

    /* ===== carousel: the booking-site look, midnight or pearl ===== */
    '.gtmr-carousel{--mid:#0B152D;--pearl:#FFF9EE;--orange:#FF640F;--carib:#ADD1CF;font-family:Manrope,sans-serif;padding:96px 32px;text-align:center;-webkit-font-smoothing:antialiased}',
    '.gtmr-carousel.is-midnight{background:var(--mid);color:var(--pearl)}',
    '.gtmr-carousel.is-pearl{background:var(--pearl);color:var(--mid)}',
    '.gtmr-in{max-width:1200px;margin:0 auto}',
    '.gtmr-carousel .gtmr-h{font:400 54px/1.05 "Instrument Serif",serif !important;color:inherit !important;margin:0 0 18px !important;text-transform:none !important;letter-spacing:normal !important}',
    '.gtmr-ratings{display:flex;justify-content:center;flex-wrap:wrap;gap:8px 28px;margin-top:10px;font-size:15px}',
    '.gtmr-carousel .gtmr-ratings a{color:inherit !important;text-decoration:none !important;border-bottom:1px solid var(--carib);padding-bottom:1px}',
    '.gtmr-carousel.is-midnight .gtmr-ratings a{border-bottom-color:rgba(173,209,207,.6)}',
    '.gtmr-stars{color:var(--orange);letter-spacing:2px;font-size:16px;white-space:nowrap}',
    '.gtmr-stars .is-off{opacity:.3}',
    '.gtmr-track{display:flex;gap:24px;margin-top:48px;text-align:left;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain;align-items:stretch}',
    '.gtmr-track::-webkit-scrollbar{display:none}',
    '.gtmr-card{flex:0 0 calc((100% - 48px) / 3);scroll-snap-align:start;border:1px solid var(--carib);border-radius:2em;padding:30px;display:flex;flex-direction:column;margin:0}',
    '.gtmr-carousel.is-midnight .gtmr-card{border-color:rgba(173,209,207,.55);background:transparent}',
    '.gtmr-carousel.is-pearl .gtmr-card{background:var(--pearl)}',
    '.gtmr-carousel .gtmr-quote{border:0 !important;padding:0 !important;margin:14px 0 0 !important;font:400 21px/1.35 "Instrument Serif",serif !important;color:inherit !important;white-space:pre-line;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:7;overflow:hidden}',
    '.gtmr-card.is-open .gtmr-quote{-webkit-line-clamp:unset;display:block}',
    '.gtmr-carousel button.gtmr-more{align-self:flex-start;background:none !important;border:0 !important;padding:0 !important;margin:10px 0 0;color:inherit !important;font:600 13px/1 Manrope,sans-serif !important;letter-spacing:.08em !important;text-transform:uppercase !important;border-bottom:1px solid var(--orange) !important;padding-bottom:3px !important;cursor:pointer}',
    '.gtmr-carousel button.gtmr-more[hidden]{display:none}',
    '.gtmr-cite{display:block;font-style:normal;font-size:14px;font-weight:600;margin-top:auto;padding-top:22px}',
    '.gtmr-carousel .gtmr-cite a{font-weight:400;color:inherit !important;opacity:.72;text-decoration:none !important}',
    '.gtmr-carousel .gtmr-cite a:hover{opacity:1;text-decoration:underline !important}',
    '.gtmr-nav{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:30px}',
    '.gtmr-carousel button.gtmr-arrow{width:44px;height:44px;border-radius:50%;border:1.5px solid currentColor !important;background:transparent !important;color:inherit !important;font:400 20px/1 Manrope,sans-serif !important;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0 !important;transition:background .2s,color .2s}',
    '.gtmr-carousel.is-midnight button.gtmr-arrow:hover{background:var(--pearl) !important;color:var(--mid) !important}',
    '.gtmr-carousel.is-pearl button.gtmr-arrow:hover{background:var(--mid) !important;color:var(--pearl) !important}',
    '.gtmr-dots{display:flex;gap:8px;align-items:center}',
    '.gtmr-carousel .gtmr-dots button{width:10px;height:10px;border-radius:50%;border:0 !important;padding:0 !important;cursor:pointer}',
    '.gtmr-carousel.is-midnight .gtmr-dots button{background:rgba(255,249,238,.35) !important}',
    '.gtmr-carousel.is-pearl .gtmr-dots button{background:rgba(11,21,45,.25) !important}',
    '.gtmr-carousel .gtmr-dots button.is-on{background:var(--orange) !important}',
    '.gtmr-count{font-size:14px;font-weight:600;min-width:4.5em;text-align:center}',
    '@media (max-width:1100px){.gtmr-card{flex-basis:calc((100% - 24px) / 2)}}',
    '@media (max-width:767px){.gtmr-carousel{padding:64px 20px}.gtmr-carousel .gtmr-h{font-size:40px !important}' +
      '.gtmr-track{gap:16px;margin:36px -20px 0;padding:0 20px;scroll-padding:0 20px}.gtmr-card{flex:0 0 100%;padding:26px}.gtmr-nav{margin-top:22px}}',

    /* ===== rail: Google's look, horizontal cards ===== */
    '.gtmr-rail{--t:#202124;--m:#70757a;--l:#dadce0;--b:#1a73e8;font-family:"Google Sans",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--t);-webkit-font-smoothing:antialiased;max-width:1180px;margin:0 auto;background:#fff;padding:28px 28px 12px;border-radius:12px}',
    '.gtmr-rail-head{display:flex;align-items:center;gap:28px;flex-wrap:wrap;padding:0 4px 20px}',
    '.gtmr-brand{display:flex;align-items:center;gap:10px}',
    '.gtmr-g{width:26px;height:26px;display:block;flex:none}',
    '.gtmr-brand-label{font-size:20px;font-weight:500;letter-spacing:-.1px}',
    '.gtmr-links{margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.gtmr-rail a.gtmr-link{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:500;color:var(--b) !important;text-decoration:none !important;padding:8px 14px;border:1px solid var(--l);border-radius:999px;white-space:nowrap;transition:background-color .15s,border-color .15s}',
    '.gtmr-rail a.gtmr-link:hover{background:#f1f3f4;border-color:#c6cacd}',
    '.gtmr-link-rating{font-size:15px;font-weight:500;color:#c5221f;line-height:1}',
    '.gtmr-link-region{font-size:12px;font-weight:500;color:var(--m);letter-spacing:.3px}',
    '.gtmr-ext{width:14px;height:14px;display:block;flex:none}',
    '.gtmr-gstars{display:inline-flex;gap:1px;line-height:0;flex:none}',
    '.gtmr-gstars svg{display:block}',
    '.gtmr-gstars-sm svg{width:15px;height:15px}',
    '.gtmr-gstars-xs svg{width:12px;height:12px}',
    '.gtmr-gstars-md svg{width:15px;height:15px}',
    '.gtmr-rail-wrap{position:relative}',
    '.gtmr-rail-list{list-style:none;margin:0;padding:4px 4px 18px;display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x proximity;scroll-behavior:smooth;scrollbar-width:none;cursor:grab}',
    '.gtmr-rail-list::-webkit-scrollbar{display:none}',
    '.gtmr-rail-list:focus-visible{outline:2px solid var(--b);outline-offset:2px;border-radius:8px}',
    '.gtmr-rail-list.is-dragging{cursor:grabbing;scroll-behavior:auto;scroll-snap-type:none}',
    '.gtmr-rail-list.is-dragging *{user-select:none}',
    '.gtmr-gcard{flex:0 0 auto;width:340px;scroll-snap-align:start;background:#fff;border:1px solid var(--l);border-radius:8px;padding:18px 18px 20px;display:flex;flex-direction:column;gap:12px;margin:0}',
    '.gtmr-gcard-head{display:flex;align-items:center;gap:12px}',
    '.gtmr-avatar{width:40px;height:40px;border-radius:50%;flex:none;display:grid;place-items:center;color:#fff;font-size:17px;font-weight:500;line-height:1}',
    '.gtmr-meta{min-width:0}',
    '.gtmr-name{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.gtmr-when{font-size:13px;color:var(--m);margin-top:2px}',
    '.gtmr-rail .gtmr-when a{color:var(--m) !important;text-decoration:none !important}',
    '.gtmr-rail .gtmr-when a:hover{color:var(--b) !important;text-decoration:underline !important}',
    '.gtmr-body{font-size:14px;line-height:1.55;color:#3c4043;margin:0;white-space:pre-wrap}',
    '.gtmr-rail button.gtmr-gmore{align-self:flex-start;background:none !important;border:0 !important;padding:0 !important;font-size:14px;color:var(--b) !important;cursor:pointer}',
    '.gtmr-rail button.gtmr-gmore:hover{text-decoration:underline}',
    '.gtmr-rail button.gtmr-garrow{position:absolute;top:calc(50% - 9px);transform:translateY(-50%);z-index:2;width:40px;height:40px;border-radius:50%;border:1px solid var(--l) !important;background:#fff !important;box-shadow:0 1px 3px rgba(60,64,67,.16);display:grid;place-items:center;cursor:pointer;padding:0 !important;transition:opacity .18s,box-shadow .18s}',
    '.gtmr-garrow svg{width:24px;height:24px;display:block}',
    '.gtmr-rail button.gtmr-garrow:hover{box-shadow:0 1px 6px rgba(60,64,67,.28)}',
    '.gtmr-garrow.is-prev{left:-18px}.gtmr-garrow.is-next{right:-18px}',
    '.gtmr-rail button.gtmr-garrow[disabled]{opacity:0;pointer-events:none}',
    '@media (max-width:991px){.gtmr-rail button.gtmr-garrow{display:none}.gtmr-links{margin-left:0}}',
    '@media (max-width:767px){.gtmr-rail-head{gap:16px;padding-bottom:16px}.gtmr-gcard{width:84vw;max-width:330px}.gtmr-rail-list{gap:12px}}',

    /* ===== strip: Google's look, one review at a time, fixed height ===== */
    '.gtmr-strip{--t:#202124;--m:#70757a;--l:#dadce0;--b:#1a73e8;font-family:"Google Sans",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--t);-webkit-font-smoothing:antialiased;max-width:1180px;margin:0 auto;padding:13px 20px 14px;background:#fff;border:1px solid var(--l);border-radius:12px}',
    '.gtmr-strip-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:10px;margin-bottom:10px;border-bottom:1px solid var(--l);min-height:30px}',
    '.gtmr-sbrand{display:flex;align-items:center;gap:10px;min-width:0;transition:opacity .22s}',
    '.gtmr-sbrand.is-swapping,.gtmr-sreview.is-swapping{opacity:0}',
    '.gtmr-slogo{display:flex;align-items:center;gap:6px;flex:none}',
    '.gtmr-slogo .gtmr-g{width:22px;height:22px}',
    '.gtmr-swordmark{font-size:15px;font-weight:600;letter-spacing:-.2px}',
    '.gtmr-srating{font-size:17px;font-weight:500;line-height:1;flex:none;color:#c5221f}',
    '.gtmr-strip a.gtmr-slink{font-size:12px;color:var(--m) !important;text-decoration:none !important;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.gtmr-strip a.gtmr-slink:hover{color:var(--b) !important;text-decoration:underline !important}',
    '.gtmr-slink .gtmr-ext{width:11px;height:11px}',
    '.gtmr-sreview{display:flex;align-items:flex-start;gap:11px;transition:opacity .22s}',
    '.gtmr-strip .gtmr-avatar{width:34px;height:34px;font-size:14px}',
    '.gtmr-sbody{min-width:0;flex:1 1 auto}',
    '.gtmr-smeta{display:flex;align-items:center;gap:7px;flex-wrap:nowrap;overflow:hidden;margin-bottom:3px}',
    '.gtmr-sname{font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}',
    '.gtmr-ssep,.gtmr-swhen{font-size:12px;color:var(--m);flex:none}',
    /* Fixed height, never min-height, or the hero above shifts on every rotation */
    '.gtmr-stext{margin:0;font-size:13.5px;line-height:1.5;color:#3c4043;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;height:41px}',
    '.gtmr-snav{display:flex;align-items:center;gap:6px;flex:none}',
    '.gtmr-strip button.gtmr-sarrow{width:28px;height:28px;border-radius:50%;border:1px solid var(--l) !important;background:#fff !important;display:grid;place-items:center;cursor:pointer;padding:0 !important}',
    '.gtmr-sarrow svg{width:18px;height:18px;display:block}',
    '.gtmr-strip button.gtmr-sarrow:hover{background:#f1f3f4 !important}',
    '.gtmr-scount{font-size:12px;color:var(--m);min-width:3.6em;text-align:center}',
    '@media (max-width:767px){.gtmr-strip{padding:12px 14px}.gtmr-strip-head{padding-bottom:8px;margin-bottom:8px}.gtmr-scount,.gtmr-strip a.gtmr-slink{display:none}.gtmr-stext{-webkit-line-clamp:1;height:20px}}',
    '@media (prefers-reduced-motion:reduce){.gtmr-sbrand,.gtmr-sreview{transition:none}}'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('gtmr-css')) return;
    var s = document.createElement('style');
    s.id = 'gtmr-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ================== carousel ================== */
  function buildCarousel(root, set) {
    var theme = root.getAttribute('data-gtmr-theme') === 'pearl' ? 'pearl' : 'midnight';
    var heading = root.getAttribute('data-gtmr-heading');
    if (heading == null) heading = 'What our travellers say';

    var sec = el('section', 'gtmr gtmr-carousel is-' + theme);
    sec.setAttribute('aria-label', 'Google reviews');
    var inner = el('div', 'gtmr-in');
    sec.appendChild(inner);
    if (heading && heading !== 'none') inner.appendChild(el('h2', 'gtmr-h', heading));

    var ratings = el('div', 'gtmr-ratings');
    set.shownListings.forEach(function (l) {
      var a = link(l.url);
      a.appendChild(gtmStars(Math.round(parseFloat(l.rating))));
      a.appendChild(document.createTextNode(' ' + l.rating + ' ' + l.label + ' on Google'));
      ratings.appendChild(a);
    });
    inner.appendChild(ratings);

    var track = el('div', 'gtmr-track');
    track.setAttribute('tabindex', '0');
    track.setAttribute('aria-label', 'Google reviews, scroll sideways for more');
    set.reviews.forEach(function (r) {
      var l = set.listings[r.listing];
      var card = el('figure', 'gtmr-card');
      card.appendChild(gtmStars(r.stars));
      var q = el('blockquote', 'gtmr-quote', '“' + String(r.text).trim() + '”');
      card.appendChild(q);
      var more = el('button', 'gtmr-more', 'Read more');
      more.type = 'button';
      more.hidden = true;
      more.addEventListener('click', function () {
        var open = card.classList.toggle('is-open');
        more.textContent = open ? 'Show less' : 'Read more';
        more.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      card.appendChild(more);
      var cite = el('figcaption', 'gtmr-cite', r.name + ' ');
      var a = link(l.url);
      a.textContent = '· Google review, ' + l.label;
      cite.appendChild(a);
      card.appendChild(cite);
      track.appendChild(card);
    });
    inner.appendChild(track);

    var nav = el('div', 'gtmr-nav');
    var prev = el('button', 'gtmr-arrow', '←');
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Previous reviews');
    var dotsWrap = el('div', 'gtmr-dots');
    var next = el('button', 'gtmr-arrow', '→');
    next.type = 'button';
    next.setAttribute('aria-label', 'Next reviews');
    nav.appendChild(prev);
    nav.appendChild(dotsWrap);
    nav.appendChild(next);
    inner.appendChild(nav);

    root.appendChild(sec);
    wireCarousel(track, prev, next, dotsWrap);
  }

  /* "Read more" appears only on a quote the clamp has actually cut. */
  function syncMore(track) {
    [].forEach.call(track.querySelectorAll('.gtmr-card'), function (card) {
      if (card.classList.contains('is-open')) return;
      var q = card.querySelector('.gtmr-quote');
      card.querySelector('.gtmr-more').hidden = q.scrollHeight <= q.clientHeight + 2;
    });
  }

  /* Native swipe/scroll, plus wrapping arrows and one dot per resting position
     (a counter instead once there are too many dots to fit a phone).
     Snap is lifted during a programmatic scroll because mandatory snap cancels
     smooth scrolling, then restored once the scroll has landed. */
  function wireCarousel(track, prev, next, dotsWrap) {
    var cards = [].slice.call(track.children);
    var dots = [], counter = null, stops = 1;
    var MAX_DOTS = 9;

    function step() { return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth; }
    function visible() { return Math.max(1, Math.round(track.clientWidth / step())); }
    function current() { return Math.min(stops - 1, Math.round(track.scrollLeft / step())); }
    function paint() {
      var c = current();
      dots.forEach(function (d, i) { d.classList.toggle('is-on', i === c); });
      if (counter) counter.textContent = (c + 1) + ' / ' + stops;
    }
    function settle(target) {
      var last = track.scrollLeft, moved = false, still = 0, frames = 0;
      (function check() {
        var x = track.scrollLeft;
        if (Math.abs(x - last) >= 0.5) { moved = true; still = 0; } else { still++; }
        last = x;
        if (Math.abs(x - target) < 1 || (moved && still >= 6) || ++frames > 180) {
          track.style.scrollSnapType = ''; paint(); return;
        }
        requestAnimationFrame(check);
      })();
    }
    function go(i) {
      i = Math.max(0, Math.min(stops - 1, i));
      var target = Math.min(i * step(), track.scrollWidth - track.clientWidth);
      track.style.scrollSnapType = 'none';
      track.scrollTo({ left: target, behavior: reduceMotion ? 'auto' : 'smooth' });
      requestAnimationFrame(function () { settle(target); });
    }
    function build() {
      stops = Math.max(1, cards.length - visible() + 1);
      dotsWrap.innerHTML = '';
      dots = [];
      counter = null;
      prev.parentNode.style.display = stops > 1 ? '' : 'none';
      if (stops > MAX_DOTS) {
        counter = el('span', 'gtmr-count');
        counter.setAttribute('aria-live', 'polite');
        dotsWrap.appendChild(counter);
      } else {
        for (var i = 0; i < stops; i++) {
          var b = el('button');
          b.type = 'button';
          b.setAttribute('aria-label', 'Show reviews from ' + (i + 1));
          b.addEventListener('click', (function (n) { return function () { go(n); }; })(i));
          dotsWrap.appendChild(b);
          dots.push(b);
        }
      }
      paint();
      syncMore(track);
    }
    prev.addEventListener('click', function () { var c = current(); go(c <= 0 ? stops - 1 : c - 1); });
    next.addEventListener('click', function () { var c = current(); go(c >= stops - 1 ? 0 : c + 1); });
    track.addEventListener('scroll', paint, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
    });
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(build, 150); });
    /* The serif loads after first paint on some pages, which changes where the clamp cuts */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { syncMore(track); });
    build();
  }

  /* ================== rail ================== */
  function buildRail(root, set) {
    var wrap = el('div', 'gtmr gtmr-rail');
    var head = el('div', 'gtmr-rail-head');
    var brand = el('div', 'gtmr-brand');
    brand.appendChild(googleG('gtmr-g'));
    brand.appendChild(el('span', 'gtmr-brand-label', 'Reviews'));
    head.appendChild(brand);
    var links = el('div', 'gtmr-links');
    set.shownListings.forEach(function (l) {
      var a = link(l.url, 'gtmr-link');
      a.appendChild(el('span', 'gtmr-link-rating', l.rating));
      a.appendChild(googleStars(Math.round(parseFloat(l.rating)), 'gtmr-gstars-sm'));
      a.appendChild(el('span', 'gtmr-link-region', l.label));
      a.appendChild(svg('0 0 24 24', EXT_PATH, 'currentColor', 'gtmr-ext'));
      a.setAttribute('aria-label', l.rating + ' out of 5, ' + l.label + ', on Google');
      links.appendChild(a);
    });
    head.appendChild(links);
    wrap.appendChild(head);

    var railWrap = el('div', 'gtmr-rail-wrap');
    var prev = el('button', 'gtmr-garrow is-prev');
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Previous reviews');
    prev.appendChild(svg('0 0 24 24', PREV_PATH, '#5f6368'));
    var list = el('ul', 'gtmr-rail-list');
    list.setAttribute('tabindex', '0');
    list.setAttribute('aria-label', 'Google reviews, scrollable');
    var next = el('button', 'gtmr-garrow is-next');
    next.type = 'button';
    next.setAttribute('aria-label', 'More reviews');
    next.appendChild(svg('0 0 24 24', NEXT_PATH, '#5f6368'));

    set.reviews.forEach(function (r) {
      var l = set.listings[r.listing];
      var card = el('li', 'gtmr-gcard');
      var h = el('div', 'gtmr-gcard-head');
      var av = el('span', 'gtmr-avatar', initial(r.name));
      av.style.background = avatarColour(r.name);
      av.setAttribute('aria-hidden', 'true');
      var meta = el('div', 'gtmr-meta');
      meta.appendChild(el('div', 'gtmr-name', r.name));
      var w = el('div', 'gtmr-when', when(r.date) ? when(r.date) + ' · ' : '');
      var a = link(l.url);
      a.textContent = l.label;
      w.appendChild(a);
      meta.appendChild(w);
      h.appendChild(av);
      h.appendChild(meta);
      card.appendChild(h);
      card.appendChild(googleStars(r.stars, 'gtmr-gstars-sm'));
      var text = String(r.text).trim();
      var short = text.length > RAIL_TRUNCATE_AT ? text.slice(0, RAIL_TRUNCATE_AT).replace(/\s+\S*$/, '') + '…' : null;
      var body = el('p', 'gtmr-body', short || text);
      card.appendChild(body);
      if (short) {
        var toggle = el('button', 'gtmr-gmore', 'More');
        toggle.type = 'button';
        var open = false;
        toggle.addEventListener('click', function () {
          open = !open;
          body.textContent = open ? text : short;
          toggle.textContent = open ? 'Less' : 'More';
        });
        card.appendChild(toggle);
      }
      list.appendChild(card);
    });

    railWrap.appendChild(prev);
    railWrap.appendChild(list);
    railWrap.appendChild(next);
    wrap.appendChild(railWrap);
    root.appendChild(wrap);
    wireRail(list, prev, next);
  }

  function wireRail(rail, prev, next) {
    function offsets() {
      var pad = parseFloat(getComputedStyle(rail).paddingLeft) || 0;
      return [].map.call(rail.children, function (c) { return Math.max(0, Math.round(c.offsetLeft - rail.offsetLeft - pad)); });
    }
    function go(dir) {
      var o = offsets(), max = rail.scrollWidth - rail.clientWidth, cur = rail.scrollLeft;
      var target = dir > 0 ? max : 0, i;
      if (dir > 0) { for (i = 0; i < o.length; i++) if (o[i] > cur + 4) { target = Math.min(o[i], max); break; } }
      else { for (i = o.length - 1; i >= 0; i--) if (o[i] < cur - 4) { target = o[i]; break; } }
      rail.scrollTo({ left: target, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    /* Snap rests the first card at the list's 4px padding, not at 0 */
    function sync() {
      prev.disabled = rail.scrollLeft <= 6;
      next.disabled = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 6;
    }
    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();

    var down = false, startX = 0, startScroll = 0, moved = 0;
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      down = true; moved = 0; startX = e.clientX; startScroll = rail.scrollLeft;
      rail.classList.add('is-dragging');
    });
    rail.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      moved = Math.abs(dx);
      rail.scrollLeft = startScroll - dx;
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (evt) {
      rail.addEventListener(evt, function () {
        if (!down) return;
        down = false;
        rail.classList.remove('is-dragging');
        sync();
      });
    });
    rail.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    rail.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
  }

  /* ================== strip ================== */
  function buildStrip(root, set) {
    var REVIEWS = set.reviews;
    if (!REVIEWS.length) return;
    var wrap = el('div', 'gtmr gtmr-strip');
    var head = el('div', 'gtmr-strip-head');
    var brand = el('div', 'gtmr-sbrand');
    var nav = el('div', 'gtmr-snav');
    var prev = el('button', 'gtmr-sarrow');
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Previous review');
    prev.appendChild(svg('0 0 24 24', PREV_PATH, '#5f6368'));
    var count = el('span', 'gtmr-scount');
    var next = el('button', 'gtmr-sarrow');
    next.type = 'button';
    next.setAttribute('aria-label', 'Next review');
    next.appendChild(svg('0 0 24 24', NEXT_PATH, '#5f6368'));
    nav.appendChild(prev);
    nav.appendChild(count);
    nav.appendChild(next);
    head.appendChild(brand);
    head.appendChild(nav);
    wrap.appendChild(head);

    var review = el('div', 'gtmr-sreview');
    review.setAttribute('aria-live', 'polite');
    var av = el('span', 'gtmr-avatar');
    av.setAttribute('aria-hidden', 'true');
    var body = el('div', 'gtmr-sbody');
    var meta = el('div', 'gtmr-smeta');
    var nameEl = el('span', 'gtmr-sname');
    var sep = el('span', 'gtmr-ssep', '·');
    sep.setAttribute('aria-hidden', 'true');
    var whenEl = el('span', 'gtmr-swhen');
    var starSlot = el('span');
    meta.appendChild(nameEl);
    meta.appendChild(sep);
    meta.appendChild(whenEl);
    meta.appendChild(starSlot);
    var textEl = el('p', 'gtmr-stext');
    body.appendChild(meta);
    body.appendChild(textEl);
    review.appendChild(av);
    review.appendChild(body);
    wrap.appendChild(review);
    root.appendChild(wrap);

    var current = 0, timer = null;

    /* The rating and link shown are those of the listing THIS review lives on */
    function renderBrand(r) {
      var l = set.listings[r.listing];
      brand.innerHTML = '';
      var logo = el('span', 'gtmr-slogo');
      logo.appendChild(googleG('gtmr-g'));
      logo.appendChild(el('span', 'gtmr-swordmark', 'Reviews'));
      brand.appendChild(logo);
      brand.appendChild(el('span', 'gtmr-srating', l.rating));
      brand.appendChild(googleStars(Math.round(parseFloat(l.rating)), 'gtmr-gstars-md'));
      var a = link(l.url, 'gtmr-slink');
      a.textContent = 'Read our ' + l.label + ' reviews';
      a.appendChild(svg('0 0 24 24', EXT_PATH, 'currentColor', 'gtmr-ext'));
      brand.appendChild(a);
    }
    function render(i) {
      var r = REVIEWS[i];
      renderBrand(r);
      av.style.background = avatarColour(r.name);
      av.textContent = initial(r.name);
      nameEl.textContent = r.name;
      whenEl.textContent = when(r.date);
      sep.style.display = r.date ? '' : 'none';
      textEl.textContent = String(r.text).trim();
      var fresh = googleStars(r.stars, 'gtmr-gstars-xs');
      starSlot.parentNode.replaceChild(fresh, starSlot);
      starSlot = fresh;
      count.textContent = (i + 1) + ' / ' + REVIEWS.length;
    }
    function show(i) {
      var n = ((i % REVIEWS.length) + REVIEWS.length) % REVIEWS.length;
      if (reduceMotion) { current = n; render(n); return; }
      review.classList.add('is-swapping');
      brand.classList.add('is-swapping');
      setTimeout(function () {
        current = n;
        render(n);
        review.classList.remove('is-swapping');
        brand.classList.remove('is-swapping');
      }, 220);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() {
      stop();
      if (reduceMotion || REVIEWS.length < 2) return;
      timer = setInterval(function () { show(current + 1); }, STRIP_AUTOPLAY_MS);
    }
    wrap.addEventListener('mouseenter', stop);
    wrap.addEventListener('mouseleave', restart);
    wrap.addEventListener('focusin', stop);
    wrap.addEventListener('focusout', restart);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else restart(); });
    prev.addEventListener('click', function () { show(current - 1); restart(); });
    next.addEventListener('click', function () { show(current + 1); restart(); });
    render(0);
    restart();
  }

  /* ================== mount ================== */
  var LAYOUTS = { carousel: buildCarousel, rail: buildRail, strip: buildStrip };

  function mount() {
    var roots = [].filter.call(document.querySelectorAll('[data-gtm-reviews]'), function (r) {
      return !r.hasAttribute('data-gtmr-ready');
    });
    if (!roots.length) return;
    roots.forEach(function (r) { r.setAttribute('data-gtmr-ready', ''); });
    loadData().then(function (data) {
      injectCss();
      roots.forEach(function (root) {
        var build = LAYOUTS[root.getAttribute('data-gtm-reviews')] || buildCarousel;
        var set = pick(data, root);
        if (!set.reviews.length) return;
        try { build(root, set); } catch (e) { root.innerHTML = ''; }
      });
    }).catch(function () { /* no data, no embed: it stays empty and hidden */ });
  }

  window.GTMReviews = { mount: mount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
