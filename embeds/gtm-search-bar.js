/* =====================================================================
   GTM HOTEL SEARCH BAR - shared behaviour
   ---------------------------------------------------------------------
   Hosted at https://global-travel-moments.github.io/styles/embeds/gtm-search-bar.js

   ONE copy of the logic for every search-bar placement. Each embed ships
   markup + its own CSS + a <script src> pointing here, and carries its
   configuration on the root element as data attributes. A fix made here
   reaches every placement - including the partner sites we cannot paste
   into - within the 10 minute GitHub Pages cache.

   Before this file existed the same 300 lines were duplicated inside 15
   embeds and mirrored by hand. Do not put logic back into an embed.

   HOW AN EMBED OPTS IN
   --------------------
     <div class="gtm-hsb"
          data-hsb-root
          data-hsb-target="self"                 self (default) | blank
          data-hsb-utm-source="gtm-website"
          data-hsb-utm-medium="referral"
          data-hsb-utm-campaign="hotel-desk"
          data-hsb-utm-id="hotel-desk-2026"
          data-hsb-utm-content="hotel-search-page"
          data-hsb-utm-term="area-search">

   The class is CSS only. This file finds roots by data-hsb-root, so any
   layout and any namespace works, and several can share one page.
   Omit every utm attribute and the bar runs untracked - that is what the
   files in _base-components/ do.

   An older embed with its own inline script is IGNORED here (it has no
   data-hsb-root), so old and new can sit on the same site while the
   pages are re-pasted one at a time.
   ===================================================================== */
(function () {
  var ENDPOINT = 'https://book.globaltravelmoments.com/app/0/hotel/0/search_hotels.html';
  var HATOKEN = 'GTCGTM01';
  var SEARCH_RADIUS_MILES = 20;
  var PHOTON_URL = 'https://photon.komoot.io/api/';

  /* --- UTM tracking ----------------------------------------------------
     Appended to the booking-site URL so searches started from a placement
     are attributable. Read from the root's data attributes; an absent or
     empty value simply drops that parameter.

     Fields follow the six-field GTM UTM convention:
       utm_source   who sent the click
       utm_medium   channel type (keep it a GA4-recognised value)
       utm_campaign the campaign / programme
       utm_id       the wave, stable across the push
       utm_content  the placement - THIS is the field that separates one
                    search bar from another
       utm_term     the link type; search bars are always 'area-search'

     !! Read this before trusting these in GA4: search_hotels.html answers
     with a 302 and drops the whole query string, so GA4 on the booking
     site does NOT see them yet. They are repeated in the URL hash, which
     survives the redirect, and go live the moment a hash-reading tag is
     added to the booking site's header slot. Today the working
     measurement is the hotel_search dataLayer push below, which carries
     search_campaign + search_placement to GA4 on the website side.
  ------------------------------------------------------------------- */
  var UTM_KEYS = ['source', 'medium', 'campaign', 'id', 'content', 'term'];

  /* Several bars can share a page, so every listbox and option needs an id of
     its own or aria-activedescendant points at the wrong bar's row. */
  var instanceCount = 0;

  function readUTM(root) {
    var utm = {};
    UTM_KEYS.forEach(function (k) {
      var v = root.getAttribute('data-hsb-utm-' + k);
      if (v) utm['utm_' + k] = v;
    });
    return utm;
  }

  function describe(feature) {
    var p = feature.properties || {};
    var coords = feature.geometry.coordinates; // [lng, lat]
    var main = p.name || p.city || p.street || p.country || 'Unknown';
    var parts = [];
    if (p.city && p.city !== main) parts.push(p.city);
    if (p.state && p.state !== main) parts.push(p.state);
    if (p.country && p.country !== main) parts.push(p.country);
    return {
      name: main,
      label: [main].concat(parts).join(', '),
      sub: parts.join(', '),
      lat: coords[1],
      lng: coords[0]
    };
  }

  function lookup(query) {
    var url = PHOTON_URL + '?q=' + encodeURIComponent(query) + '&limit=6&lang=en';
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Photon ' + res.status);
      return res.json();
    }).then(function (data) {
      return (data.features || []).map(describe);
    });
  }

  function enc(key, value) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(value);
  }

  function isoToRevelex(iso) {
    if (!iso) return '';
    var b = iso.split('-');
    return b[1] + '/' + b[2] + '/' + b[0];
  }

  function initSearchBar(root) {
    var q = function (sel) { return root.querySelector(sel); };

    var UTM = readUTM(root);
    var newTab = root.getAttribute('data-hsb-target') === 'blank';

    var destInput = q('[data-hsb="dest"]');
    var lockFlag = q('[data-hsb="lock"]');
    var sugBox = q('[data-hsb="suggestions"]');
    var checkIn = q('[data-hsb="checkin"]');
    var checkOut = q('[data-hsb="checkout"]');
    var adultsEl = q('[data-hsb="adults"]');
    var childrenEl = q('[data-hsb="children"]');
    var roomsEl = q('[data-hsb="rooms"]');
    var fiveStarEl = q('[data-hsb="fivestar"]');
    var fourStarEl = q('[data-hsb="fourstar"]');
    var childAgesEl = q('[data-hsb="childages"]');
    var errorEl = q('[data-hsb="error"]');
    var searchBtn = q('[data-hsb="search"]');
    var searchLabel = q('[data-hsb="searchlabel"]');

    if (!destInput || !searchBtn) return; // markup is not a search bar

    /* --- accessibility ---------------------------------------------------
       The suggestion list is a combobox + listbox. All of it is applied from
       here rather than from the embed markup, so no page has to be re-pasted
       to get it - which is the whole point of the shared file.

       A screen reader needs three things the sighted user gets for free: that
       a list opened, which row is currently highlighted, and how many rows
       there are. aria-expanded, aria-activedescendant and the live region
       below are those three.
    --------------------------------------------------------------------- */
    var listId = sugBox.id || ('hsb-list-' + (++instanceCount));
    sugBox.id = listId;
    sugBox.setAttribute('role', 'listbox');
    destInput.setAttribute('role', 'combobox');
    destInput.setAttribute('aria-autocomplete', 'list');
    destInput.setAttribute('aria-expanded', 'false');
    destInput.setAttribute('aria-controls', listId);

    /* Announcements go in their own polite region, NOT in the listbox: a
       listbox whose children are not options is invalid, and the "Searching"
       line is decoration for the eye, not a choice. Styled inline so the
       embeds need no new CSS. */
    var live = document.createElement('div');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('role', 'status');
    live.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;' +
      'padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
    root.appendChild(live);
    function announce(msg) { live.textContent = msg; }

    function setActiveDescendant(id) {
      if (id) destInput.setAttribute('aria-activedescendant', id);
      else destInput.removeAttribute('aria-activedescendant');
    }

    var selectedGeo = null;
    var activeIndex = -1;
    var currentResults = [];
    var debounceTimer = null;
    var requestSeq = 0;     // only the newest Photon reply may render
    var pointerInList = false;

    /* Anything that empties the list MUST empty currentResults with it.
       Leaving them behind was a real, reproducible fault: the box showed
       "Searching..." for the new query while currentResults still held the
       previous query's cities, so Down + Return locked a city the visitor
       could no longer see. Verified live on /book/hotel-search 2026-09-11:
       typing "Paris", then "Paris Texas", then Down + Return locked
       "Paris, Ile-de-France, France". Keep these three in step. */
    function resetResults() {
      currentResults = [];
      activeIndex = -1;
      setActiveDescendant('');
    }

    function showStatus(text) {
      resetResults();
      sugBox.replaceChildren();
      var div = document.createElement('div');
      div.className = 'hsb-status';
      div.textContent = text;
      sugBox.appendChild(div);
      sugBox.classList.remove('hsb-hidden');
      destInput.setAttribute('aria-expanded', 'false'); // open, but nothing to choose
    }

    function renderSuggestions(results) {
      currentResults = results;
      activeIndex = -1;
      sugBox.replaceChildren();
      if (!results.length) {
        showStatus('No matches. Try a different spelling.');
        return;
      }
      results.forEach(function (r, i) {
        var rowEl = document.createElement('div');
        rowEl.className = 'hsb-suggestion';
        rowEl.id = listId + '-opt-' + i;
        rowEl.setAttribute('role', 'option');
        rowEl.setAttribute('aria-selected', 'false');
        var mainEl = document.createElement('div');
        mainEl.className = 'hsb-s-main';
        mainEl.textContent = r.name;
        rowEl.appendChild(mainEl);
        if (r.sub) {
          var subEl = document.createElement('div');
          subEl.className = 'hsb-s-sub';
          subEl.textContent = r.sub;
          rowEl.appendChild(subEl);
        }
        rowEl.addEventListener('mousedown', function (e) { e.preventDefault(); pick(i); });
        sugBox.appendChild(rowEl);
      });
      sugBox.classList.remove('hsb-hidden');
      destInput.setAttribute('aria-expanded', 'true');
      announce(results.length + (results.length === 1 ? ' place found. ' : ' places found. ') +
               'Use the up and down arrows to review, Return to choose.');
    }

    function hideSuggestions() {
      sugBox.classList.add('hsb-hidden');
      destInput.setAttribute('aria-expanded', 'false');
      resetResults();
    }

    function pick(index) {
      var r = currentResults[index];
      if (!r) return;
      selectedGeo = { name: r.name, label: r.label, lat: r.lat, lng: r.lng };
      destInput.value = r.label;
      lockFlag.textContent = ' \u00B7 coordinates locked';
      announce(r.label + ' selected. Location locked.');
      hideSuggestions();
    }

    function clearGeo() {
      selectedGeo = null;
      lockFlag.textContent = '';
    }

    /* The list must not move under a cursor that is already on it. While
       the pointer is inside, a late reply is held and applied on the way
       out, so a click always lands on the row that was under it. */
    var pendingResults = null;
    sugBox.addEventListener('mouseenter', function () { pointerInList = true; });
    sugBox.addEventListener('mouseleave', function () {
      pointerInList = false;
      if (pendingResults) { var r = pendingResults; pendingResults = null; renderSuggestions(r); }
    });

    function offerResults(results) {
      if (pointerInList) { pendingResults = results; return; }
      renderSuggestions(results);
    }

    function renderChildAges() {
      var n = parseInt(childrenEl.value, 10) || 0;
      root.querySelectorAll('.hsb-ca-field').forEach(function (e) { e.remove(); });
      if (n <= 0) { childAgesEl.classList.add('hsb-hidden'); return; }
      childAgesEl.classList.remove('hsb-hidden');
      for (var i = 1; i <= n; i++) {
        var inp = document.createElement('input');
        inp.type = 'number';
        inp.min = '0';
        inp.max = '17';
        inp.value = '8';
        inp.className = 'hsb-ca-field';
        inp.setAttribute('aria-label', 'Child ' + i + ' age');
        childAgesEl.appendChild(inp);
      }
    }

    function buildURL() {
      var ci = isoToRevelex(checkIn.value);
      var co = isoToRevelex(checkOut.value);
      if (!selectedGeo || !ci || !co) return null;

      var adults = parseInt(adultsEl.value, 10) || 1;
      var children = parseInt(childrenEl.value, 10) || 0;
      var rooms = parseInt(roomsEl.value, 10) || 1;
      var ages = Array.prototype.map.call(
        root.querySelectorAll('.hsb-ca-field'),
        function (e) { return e.value || '8'; }
      );

      var p = [];
      p.push(enc('hatoken', HATOKEN));
      p.push(enc('clear', 'all'));
      p.push(enc('search[name]', selectedGeo.name));
      p.push(enc('search[latitude]', selectedGeo.lat));
      p.push(enc('search[longitude]', selectedGeo.lng));
      p.push(enc('search[distance]', SEARCH_RADIUS_MILES));
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

      var stars = [];
      if (fiveStarEl.checked) stars.push('5');
      if (fourStarEl.checked) stars.push('4');
      stars.forEach(function (s, i) {
        p.push(enc('search[star_ratings][' + i + ']', s));
      });

      // UTMs last, so they are easy to spot when eyeballing the URL.
      var utmPairs = [];
      Object.keys(UTM).forEach(function (key) {
        if (UTM[key]) utmPairs.push(enc(key, UTM[key]));
      });
      p = p.concat(utmPairs);

      // search_hotels.html answers with a 302 to hotel_selection.html and drops
      // the whole query string on the way (Revelex holds the search in session).
      // A URL fragment DOES survive that redirect, so the UTMs are repeated in
      // the hash - that is the copy the booking site can actually read.
      var hash = utmPairs.length ? '#' + utmPairs.join('&') : '';

      return ENDPOINT + '?' + p.join('&') + hash;
    }

    function validate() {
      if (!selectedGeo) return 'Type a destination and pick a suggestion to lock its location.';
      if (!checkIn.value || !checkOut.value) return 'Pick both check-in and check-out dates.';
      if (checkOut.value <= checkIn.value) return 'Check-out must be after check-in.';
      return '';
    }

    /* --- events --- */
    destInput.addEventListener('input', function () {
      if (selectedGeo) clearGeo(); // editing invalidates the lock
      var query = destInput.value.trim();
      clearTimeout(debounceTimer);
      pendingResults = null;
      if (query.length < 3) { hideSuggestions(); return; }
      showStatus('Searching\u2026');
      var seq = ++requestSeq;
      debounceTimer = setTimeout(function () {
        lookup(query).then(function (results) {
          // Two guards, because either can be the stale one: the reply must
          // be for the newest request AND the box must still hold the text
          // it was fired for.
          if (seq !== requestSeq) return;
          if (destInput.value.trim() !== query) return;
          offerResults(results);
        }).catch(function () {
          if (seq !== requestSeq) return;
          showStatus('Location lookup unavailable. Check your connection.');
          announce('Location lookup unavailable.');
        });
      }, 280);
    });

    destInput.addEventListener('keydown', function (e) {
      if (sugBox.classList.contains('hsb-hidden') || !currentResults.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var dir = e.key === 'ArrowDown' ? 1 : -1;
        activeIndex = (activeIndex + dir + currentResults.length) % currentResults.length;
        var rows = sugBox.children;
        for (var i = 0; i < rows.length; i++) {
          var on = (i === activeIndex);
          rows[i].classList.toggle('hsb-active', on);
          rows[i].setAttribute('aria-selected', on ? 'true' : 'false');
        }
        var active = rows[activeIndex];
        if (active) {
          setActiveDescendant(active.id);
          // Keep the highlighted row inside the scrolling box, or a keyboard
          // user is moving a selection they cannot see.
          if (active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0) { e.preventDefault(); pick(activeIndex); }
      } else if (e.key === 'Escape') {
        hideSuggestions();
      }
    });

    document.addEventListener('click', function (e) {
      if (!root.contains(e.target) || !e.target.closest('.hsb-field--dest')) {
        hideSuggestions();
      }
    });

    childrenEl.addEventListener('input', renderChildAges);

    /* --- working state: the button has to show the click landed, because the
       search itself takes a beat and the booking site is slow to paint --- */
    var idleLabel = searchLabel ? searchLabel.textContent : 'Search';
    function setBusy(on) {
      // The pill grows a little when the label changes. It is the last item in a
      // right-aligned row, so nothing else on the row moves.
      searchBtn.classList[on ? 'add' : 'remove']('hsb-busy');
      searchBtn.disabled = on;
      searchBtn.setAttribute('aria-busy', on ? 'true' : 'false');
      if (searchLabel) searchLabel.textContent = on ? 'Searching\u2026' : idleLabel;
    }
    // Back-button returns restore this page from cache with the button still busy.
    window.addEventListener('pageshow', function () { setBusy(false); });

    searchBtn.addEventListener('click', function () {
      var err = validate();
      errorEl.textContent = err;
      if (err) { announce(err); return; }
      var url = buildURL();
      if (!url) return;

      setBusy(true);

      var term = (selectedGeo && selectedGeo.name) || destInput.value.trim() || '';
      var payload = {
        event: 'hotel_search',
        search_term: term,
        search_campaign: UTM.utm_campaign || '',
        search_placement: UTM.utm_content || ''
      };
      window.dataLayer = window.dataLayer || [];

      if (newTab) {
        // The results open in another tab and this page stays loaded, so the
        // tag fires normally - no callback needed - and the button is handed
        // back rather than left stuck.
        window.dataLayer.push(payload);
        window.open(url, '_blank', 'noopener');
        setTimeout(function () { setBusy(false); }, 1400);
      } else {
        // Same-tab redirect, so eventCallback navigates after GTM fires the
        // tag; the setTimeout is a fallback if GTM is slow or absent.
        var navigated = false;
        function go() { if (!navigated) { navigated = true; window.location.href = url; } }
        payload.eventCallback = go;
        payload.eventTimeout = 1200;
        window.dataLayer.push(payload);
        setTimeout(go, 1200);
      }
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
    checkIn.addEventListener('change', syncCheckout);
  }

  function boot() {
    document.querySelectorAll('[data-hsb-root]:not([data-hsb-ready])').forEach(function (root) {
      root.setAttribute('data-hsb-ready', '1');
      initSearchBar(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Webflow can swap page content without a reload, and a CMS list can add a
  // bar late. Booting again is free - data-hsb-ready makes it idempotent.
  window.addEventListener('load', boot);
  window.gtmSearchBarBoot = boot;
})();
