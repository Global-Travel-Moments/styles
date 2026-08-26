/* Optional password gate for the deeplink generator.
 *
 * Netlify's free tier has no built-in password protection, and the site
 * carries the whole Revelex hotel database - so this stands in for it.
 *
 * It ships INERT. With no SITE_PASSWORD environment variable set, every
 * request passes straight through. Set SITE_PASSWORD in the Netlify UI
 * (Site configuration -> Environment variables) and the gate switches on
 * with no redeploy. Clear it to switch back off.
 *
 * Username is always "gtm"; the password is whatever the env var holds.
 * Never hard-code the password here - this file is committed.
 */
export default async (request, context) => {
  const password = Netlify.env.get('SITE_PASSWORD');
  if (!password) return; // gate disabled - serve normally

  const header = request.headers.get('authorization') || '';
  if (header.startsWith('Basic ')) {
    let decoded = '';
    try { decoded = atob(header.slice(6)); } catch { decoded = ''; }
    const separator = decoded.indexOf(':');
    if (separator !== -1 && decoded.slice(separator + 1) === password) return;
  }

  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="GTM Deeplink Generator", charset="UTF-8"',
      'Content-Type': 'text/plain'
    }
  });
};

export const config = { path: '/*' };
