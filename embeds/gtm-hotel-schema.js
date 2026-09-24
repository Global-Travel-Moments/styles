/* =====================================================================
   GTM HOTEL SCHEMA - Capella stay pages (/stay/<slug>)
   Hosted at https://global-travel-moments.github.io/styles/embeds/gtm-hotel-schema.js
   Loaded by one Embed on the Stays template (Capella review item D, 2026-09-25).

   The stay pages already describe the agency (TravelAgency) and the FAQs; this adds
   the HOTEL itself as schema.org/Hotel. Name, description, image and page URL are
   read from the page (all CMS-driven); the postal address comes from the table
   below, because Stays has no address fields. Sources: Revelex GTCHotels.csv
   (GDS ids as listed) cross-checked with the hotel-packs research. A slug missing
   from the table still gets Hotel schema, just without an address.
   Google reads JSON-LD added by script, so this needs no Webflow custom code.
   ===================================================================== */
(function () {
  var ADDRESS = {
    'capella-bangkok':   { street: '300/2 Charoenkrung Road', locality: 'Bangkok', postcode: '10120', country: 'TH', brand: 'Capella Hotels and Resorts' },
    'capella-singapore': { street: '1 The Knolls, Sentosa Island', locality: 'Singapore', postcode: '098297', country: 'SG', brand: 'Capella Hotels and Resorts' },
    'capella-taipei':    { street: 'No. 139 Dunhua North Road, Songshan District', locality: 'Taipei', postcode: '105021', country: 'TW', brand: 'Capella Hotels and Resorts' },
    'capella-kyoto':     { street: '130 Komatsu-cho', locality: 'Kyoto', postcode: '605-0811', country: 'JP', brand: 'Capella Hotels and Resorts' },
    'patina-osaka':      { street: '3-91 Banba-cho', locality: 'Osaka', postcode: '540-0007', country: 'JP', brand: 'Patina Hotels and Resorts' },
    'patina-maldives':   { street: 'Fari Islands', locality: 'North Male Atoll', postcode: '20026', country: 'MV', brand: 'Patina Hotels and Resorts' }
  };

  function meta(sel) {
    var m = document.querySelector(sel);
    return m ? (m.getAttribute('content') || '').trim() : '';
  }

  function build() {
    var slug = (window.location.pathname.match(/\/stay\/([a-z0-9-]+)/) || [])[1];
    if (!slug || document.getElementById('gtm-hotel-schema')) return;
    var h1 = document.querySelector('h1');
    var name = h1 ? h1.textContent.trim() : '';
    if (!name) return;
    var canon = document.querySelector('link[rel="canonical"]');
    var url = canon && canon.href ? canon.href : window.location.origin + window.location.pathname;
    var data = {
      '@context': 'https://schema.org',
      '@type': 'Hotel',
      '@id': url + '#hotel',
      name: name,
      url: url
    };
    var desc = meta('meta[name="description"]') || meta('meta[property="og:description"]');
    if (desc) data.description = desc;
    var img = meta('meta[property="og:image"]');
    if (img) data.image = img;
    var a = ADDRESS[slug];
    if (a) {
      data.address = {
        '@type': 'PostalAddress',
        streetAddress: a.street,
        addressLocality: a.locality,
        postalCode: a.postcode,
        addressCountry: a.country
      };
      data.brand = { '@type': 'Brand', name: a.brand };
    }
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'gtm-hotel-schema';
    s.text = JSON.stringify(data);
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
