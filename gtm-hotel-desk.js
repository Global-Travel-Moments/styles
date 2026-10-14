/* ============================================================================
   gtm-hotel-desk.js  -  The Hotel Desk sign-up and sign-in pages (Revelex)
   ----------------------------------------------------------------------------
   Adds our own hero copy and sections around Revelex's registration and login
   forms. Pairs with gtm-hotel-desk.css. Loaded async by header-uat.html (UAT)
   only until go-live.

   Revelex remote-JS rules: everything lives under window.CLIENTJS; we never
   touch their form, fields, buttons or scripts. We only insert our own
   elements next to theirs. All markup below is static strings.
   ============================================================================ */
window.CLIENTJS = window.CLIENTJS || {};
window.CLIENTJS.hd = (function () {
  var SELECT = 'https://book.globaltravelmoments.com/resources/book.globaltravelcollection.com/images/select.png';
  /* The registration page on whichever site the visitor is on (production or UAT). Revelex
     pages set a <base>, so a relative link resolves to the wrong folder: read the address
     from Revelex's own register link in the sign-in card (read only; NOT the header's links,
     which point at production even on UAT), then the login path, then production. */
  function regUrl() {
    var q = '?clear=all&hatoken=GTCGTM01';
    var theirs = document.querySelector('.members-register-extras a[href*="registration.html"]');
    if (theirs) return theirs.href.split('?')[0] + q;
    if (/\/login\.html$/.test(location.pathname)) return location.pathname.replace(/login\.html$/, 'registration.html') + q;
    return 'https://book.globaltravelmoments.com/app/0/users/0/registration.html' + q;
  }
  var PERKS = [
    'Daily breakfast for two',
    'A hotel credit to spend during your stay',
    'A room upgrade, subject to availability',
    'Early check-in and late departure, subject to availability',
    'A travel designer who checks your reservation with the hotel before you arrive'
  ];
  var NOTE = 'Where applicable. Look for the SELECT+ mark beside a hotel in your search results.';
  var STARS = '\u2605\u2605\u2605\u2605\u2605';

  function lockup() {
    return '<div class="gtm-lockup"><img src="' + SELECT + '" alt="SELECT Hotels &amp; Resorts"><span class="gtm-plus" aria-label="plus"></span></div>';
  }
  function ticks() {
    return '<ul class="gtm-ticks">' + PERKS.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>';
  }
  function perksCard() {
    return '<div class="gtm-perks-card">' + lockup() + ticks() + '<p class="gtm-note">' + NOTE + '</p></div>';
  }

  function reviews(waveFromTeal) {
    /* Verbatim from Google (whole sentences, names exactly as shown there). Source of
       truth: GTM/embeds/components/google-reviews. Ratings only, never review counts. */
    var r = [
      ['Duncan\u2019s hotel advice was spot on in response to our preferences. Tours were also very well planned.', 'Holly Sorkin'],
      ['She helped us pick spectacular hotels that were five-star quality without the five-star price.', 'Greg W'],
      ['The right rooms, the right recommendations, and those small touches you wouldn\u2019t think to ask for but make all the difference.', 'matthew drinkwater'],
      ['They take care of every detail and check in regularly.', 'Mark Brant'],
      ['Every detail was customized to us, and everything was seamless from start to finish.', 'michael waldron'],
      ['Amazing travel ideas and great to know that everything is taken care of, so you can just relax and not have to worry about planning and logistics.', 'Jon Henwood'],
      ['I had the pleasure of dealing with Duncan, not only was the service amazing but he really tailored our experience to our needs.', 'Richard Kitching'],
      ['Duncan made the process of planning a trip for 10 adults across multiple cities a breeze.', 'Daniel Mosebach'],
      ['Above and beyond may be an understatement. Rarely do you encounter a company with such professionalism and thorough, thoughtful service.', 'Matthew Murgatroyd']
    ];
    return '<section class="gtm-sec gtm-reviews-sec' + (waveFromTeal ? ' has-wave' : '') + '">' +
      (waveFromTeal ? '<div class="gtm-wave is-carib" aria-hidden="true"></div>' : '') +
      '<div class="gtm-sec-in gtm-center">' +
        '<h2>What our travellers say</h2>' +
        '<div class="gtm-ratings">' +
          '<a href="https://maps.google.com/?cid=6775153238315330732" target="_blank" rel="noopener"><span class="gtm-stars">' + STARS + '</span> 4.9 London on Google</a>' +
          '<a href="https://maps.google.com/?cid=9391311828870468762" target="_blank" rel="noopener"><span class="gtm-stars">' + STARS + '</span> 5.0 New York on Google</a>' +
        '</div>' +
        '<div class="gtm-review-grid" aria-label="Google reviews">' + r.map(function (x) {
          return '<div class="gtm-review"><span class="gtm-stars">' + STARS + '</span><blockquote>\u201c' + x[0] + '\u201d</blockquote><cite>' + x[1] + ' <span>\u00b7 Google review</span></cite></div>';
        }).join('') + '</div>' +
        '<div class="gtm-carousel-nav"><button type="button" class="gtm-prev" aria-label="Previous reviews">\u2190</button>' +
          '<div class="gtm-dots"></div>' +
          '<button type="button" class="gtm-next" aria-label="Next reviews">\u2192</button></div>' +
      '</div></section>';
  }

  function plum(line) {
    return '<section class="gtm-sec gtm-plum-sec"><div class="gtm-sec-in gtm-plum">' +
      '<div><h2>There\u2019s always someone at the desk.</h2><p>' + line + '</p></div>' +
      '<div class="gtm-pills">' +
        '<a href="tel:+442071909039"><span>UK</span>+44 20 7190 9039</a>' +
        '<a href="tel:+12125377348"><span>US</span>+1 212 537 7348</a>' +
      '</div></div></section>';
  }

  /* Review carousel on phones: native swipe, plus arrows and dots. Snap is lifted
     during a programmatic scroll because mandatory snap cancels smooth scrolling. */
  /* Review carousel: native swipe/scroll, plus wrapping arrows and one dot per resting position.
     Works out how many cards are on show (3, 2 or 1 by width) and rebuilds on resize.
     Snap is lifted during a programmatic scroll because mandatory snap cancels smooth
     scrolling, then restored. */
  function wireCarousel(root) {
    var track = root.querySelector('.gtm-review-grid');
    if (!track) return;
    var cards = [].slice.call(track.children);
    var dotsWrap = root.querySelector('.gtm-dots');
    var prev = root.querySelector('.gtm-prev'), next = root.querySelector('.gtm-next');
    var dots = [], stops = 1;

    function step() { return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth; }
    function visible() { return Math.max(1, Math.round(track.clientWidth / step())); }
    function current() { return Math.min(stops - 1, Math.round(track.scrollLeft / step())); }
    function paint() {
      var c = current();
      dots.forEach(function (d, i) { d.classList.toggle('is-on', i === c); });
    }
    /* Restore snapping only once the scroll has reached its target (or stopped moving
       after it started), or a long jump gets snapped part-way through. */
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
      track.scrollTo({ left: target, behavior: 'smooth' });
      requestAnimationFrame(function () { settle(target); });
    }
    function build() {
      stops = Math.max(1, cards.length - visible() + 1);
      dotsWrap.innerHTML = '';
      dots = [];
      for (var i = 0; i < stops; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Show reviews from ' + (i + 1));
        b.addEventListener('click', (function (n) { return function () { go(n); }; })(i));
        dotsWrap.appendChild(b);
        dots.push(b);
      }
      paint();
    }
    /* The arrows wrap: next from the last stop goes back to the first, and back again */
    prev.addEventListener('click', function () { var c = current(); go(c <= 0 ? stops - 1 : c - 1); });
    next.addEventListener('click', function () { var c = current(); go(c >= stops - 1 ? 0 : c + 1); });
    track.addEventListener('scroll', paint, { passive: true });
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(build, 150); });
    build();
  }

  function wireScrollToForm(after, card) {
    after.addEventListener('click', function (e) {
      var a = e.target.closest('a[href="#gtm-form"]');
      if (!a) return;
      e.preventDefault();
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function heroWave(hero, colour) {
    var w = document.createElement('div');
    w.className = 'gtm-hero-wave is-' + colour;
    w.setAttribute('aria-hidden', 'true');
    hero.appendChild(w);
  }

  return { regUrl: regUrl, lockup: lockup, ticks: ticks, perksCard: perksCard, reviews: reviews, plum: plum,
           wireCarousel: wireCarousel, wireScrollToForm: wireScrollToForm, heroWave: heroWave };
})();

(function () {
  function buildSignUp() {
    var hd = window.CLIENTJS && window.CLIENTJS.hd;
    var page = document.querySelector('.members-area-registration');
    var wrap = page && page.querySelector('.members-content-wrapper');
    var card = wrap && wrap.querySelector('.members-content');
    var hero = page && page.querySelector('.members-main-container');
    if (!hd || !card || !hero || document.querySelector('.gtm-reg')) return;
    card.id = 'gtm-form';

    /* 1. Hero copy, left of the form card, and the wave at its foot */
    var copy = document.createElement('div');
    copy.className = 'gtm-hero-copy gtm-reg';
    copy.innerHTML =
      '<span class="gtm-eyebrow is-orange">The Hotel Desk by Global Travel Moments</span>' +
      '<h1 class="gtm-title">Perks you won\u2019t get booking direct.</h1>' +
      '<p class="gtm-sub">Create your account to book the world\u2019s finest hotels. At every hotel marked SELECT+, your stay includes:</p>' +
      hd.perksCard();
    wrap.insertBefore(copy, wrap.firstChild);
    hd.heroWave(hero, 'carib');

    /* 2. Our heading at the top of the form card */
    var head = document.createElement('div');
    head.className = 'gtm-card-head';
    head.innerHTML = '<h2>Create your account</h2><p>It takes about a minute. Fields marked <span class="gtm-req">*</span> are required.</p>';
    var main = card.querySelector('.members-main-content');
    main.insertBefore(head, main.firstChild);

    /* 3. Sections after the hero */
    var cta = '<a class="gtm-btn" href="#gtm-form">Create your account</a>';
    var icon = function (d) { return '<span class="gtm-perk-icon"><svg viewBox="0 0 24 24">' + d + '</svg></span>'; };
    var step = function (n, h, p) { return '<div class="gtm-step"><div class="gtm-step-head"><span class="gtm-step-n">' + n + '</span><h3>' + h + '</h3></div><p>' + p + '</p></div>'; };

    var after = document.createElement('div');
    after.className = 'gtm-after gtm-reg-page';
    after.id = 'gtm-after';
    after.innerHTML =
      '<section class="gtm-sec gtm-steps-sec"><div class="gtm-sec-in gtm-center">' +
        '<h2>Three steps to the world\u2019s finest hotels</h2>' +
        '<p class="gtm-lead">No algorithms. No endless scrolling. Just the stays that matter, in the places you already want to be.</p>' +
        '<div class="gtm-steps">' +
          step('01', 'Set up your account', 'It takes about a minute, and it\u2019s yours for every trip after this one.') +
          step('02', 'Search for your perfect hotel', '4 and 5-star hotels and resorts, worldwide.') +
          step('03', 'Secure and book your stay', 'Then arrive and be expected.') +
        '</div>' +
      '</div></section>' +

      '<section class="gtm-sec gtm-founder-sec"><div class="gtm-sec-in gtm-founder">' +
        '<div><h2>The difference is in how you arrive</h2>' +
          '<p>The hotels have always been there. The question we spend our time asking is which ones are right. Right for you. Right for this journey. Right in the way that turns a stay into something you carry with you.</p>' +
          '<p>What changes, when you travel with us, is the door you walk through. The same destinations you know. A very different way of arriving in them.</p>' +
          '<div class="gtm-signoff"><strong>Duncan Greenfield-Turk</strong><span>Chief Travel Designer</span></div>' +
          cta + '</div>' +
        '<div class="gtm-founder-img"><img src="https://cdn.prod.website-files.com/678bb152f89031822d47ac39/69de07cacfa77c61f20a26e6_Global-Travel-Moments-Hotel1.jpg" alt="A hotel room with a view"></div>' +
      '</div></section>' +

      '<section class="gtm-sec gtm-perks-sec has-wave"><div class="gtm-wave is-midnight" aria-hidden="true"></div><div class="gtm-sec-in gtm-center">' + hd.lockup() +
        '<h2>What SELECT+ means when you arrive</h2>' +
        '<p class="gtm-lead">The same hotel, the same dates, the same rate. A different arrival.</p>' +
        '<div class="gtm-perk-grid">' +
          '<div class="gtm-perk">' + icon('<path d="M4 11h16M5 11a7 7 0 0014 0M9 4c0 1.5 1 1.5 1 3M13 4c0 1.5 1 1.5 1 3M8 20h8"/>') + '<h3>Breakfast for two</h3><p>Every morning of your stay.</p></div>' +
          '<div class="gtm-perk">' + icon('<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M3 11h18M7 15h3"/>') + '<h3>A hotel credit</h3><p>Something to spend at the hotel, on top of your rate.</p></div>' +
          '<div class="gtm-perk">' + icon('<path d="M12 19V5M6 11l6-6 6 6"/>') + '<h3>The upgrade</h3><p>A better room, when there\u2019s one to give.</p></div>' +
          '<div class="gtm-perk">' + icon('<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>') + '<h3>Early in, late out</h3><p>Arrive early and leave late, when the hotel can.</p></div>' +
          '<div class="gtm-perk">' + icon('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5"/>') + '<h3>Someone on your side</h3><p>A travel designer checks your reservation with the hotel before you arrive.</p></div>' +
        '</div>' +
        '<p class="gtm-perks-foot">Where applicable. Look for the SELECT+ mark beside a hotel in your search results.</p>' + cta +
      '</div></section>' +

      hd.reviews(true) +
      hd.plum('Rather talk it through? Speak to a Travel Designer in London or New York.');

    hero.parentNode.insertBefore(after, hero.nextSibling);
    hd.wireScrollToForm(after, card);
    hd.wireCarousel(after.querySelector('.gtm-reviews-sec'));
  }

  function buildSignIn() {
    var hd = window.CLIENTJS && window.CLIENTJS.hd;
    var page = document.querySelector('.members-area-page');
    if (!page || !page.querySelector('form[action*="authenticate"]')) return;
    var wrap = page && page.querySelector('.members-content-wrapper');
    var card = wrap && wrap.querySelector('.members-content');
    var hero = page && page.querySelector('.members-main-container');
    if (!hd || !card || !hero || document.querySelector('.gtm-login')) return;

    /* 1. Hero copy, left of the form (no wave on this page) */
    var copy = document.createElement('div');
    copy.className = 'gtm-hero-copy gtm-login';
    copy.innerHTML =
      '<span class="gtm-eyebrow is-orange">The Hotel Desk by Global Travel Moments</span>' +
      '<h1 class="gtm-title">Welcome back.</h1>' +
      '<p class="gtm-sub">Sign in to book. At every hotel marked SELECT+, the perks come with your stay.</p>' +
      '<div class="gtm-chips"><span>Breakfast for two</span><span>A hotel credit</span><span>Room upgrade</span><span>Early in, late out</span><span>A travel designer on your side</span></div>';
    wrap.insertBefore(copy, wrap.firstChild);

    /* 2. Card heading */
    var head = document.createElement('div');
    head.className = 'gtm-card-head';
    head.innerHTML = '<h2>Sign in</h2><p>To your private hotel and resort reservations portal.</p>';
    var main = card.querySelector('.members-main-content');
    main.parentNode.insertBefore(head, main);

    /* 3. "Not a member yet?" band, reviews, plum contact block */
    var after = document.createElement('div');
    after.className = 'gtm-after gtm-login-page';
    after.id = 'gtm-after';
    after.innerHTML =
      '<section class="gtm-sec gtm-join-sec"><div class="gtm-sec-in gtm-join">' +
        '<div><span class="gtm-eyebrow">Not a member yet?</span>' +
          '<h2>Perks you won\u2019t get booking direct</h2>' +
          '<p class="gtm-lead">The same hotel, the same dates, the same rate. A different arrival. Setting up your account takes about a minute.</p>' +
          '<a class="gtm-btn" href="' + hd.regUrl() + '">Create your account</a></div>' +
        hd.perksCard() +
      '</div><div class="gtm-wave is-down" aria-hidden="true"></div></section>' +
      hd.reviews(false) +
      hd.plum('Trouble signing in, or rather talk it through? Speak to a Travel Designer in London or New York.');

    hero.parentNode.insertBefore(after, hero.nextSibling);
    hd.wireCarousel(after.querySelector('.gtm-reviews-sec'));

    /* GA4: how many sign-in visitors switch to creating an account from our band.
       Same route as the account gate's events (Revelex's gtag, both GA4 properties).
       Beacon transport so the hit survives the navigation; never blocks the click.
       Revelex's own "Create an account" link in the card is theirs and is not tracked. */
    var join = after.querySelector('.gtm-join a.gtm-btn');
    if (join) join.addEventListener('click', function () {
      try {
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'signin_create_account', { cta_location: 'not_a_member_band', transport_type: 'beacon' });
        }
      } catch (e) { /* tracking must never break the page */ }
    });
  }

  function init() {
    try { buildSignUp(); } catch (e) {}
    try { buildSignIn(); } catch (e) {}
  }

  /* Loaded async from the header, so this usually runs while the page is still
     arriving. Build the moment Revelex's members markup is complete (the
     benefits panel is the last thing in it) rather than waiting for the whole
     page: that is what keeps the old layout from ever painting. */
  function membersReady() { return !!document.querySelector('.members-content-wrapper .members-content-benefits-section'); }
  if (membersReady() || document.readyState !== 'loading') {
    init();
  } else {
    var mo = new MutationObserver(function () {
      if (membersReady()) { mo.disconnect(); init(); }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', function () { mo.disconnect(); init(); });
  }
})();
