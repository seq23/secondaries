// The *.pages.dev preview host serves the same pages as the custom domain and
// sets no canonical of its own, so search engines can index the preview URL as
// a competing copy of venturedeals.joinwestpeek.com. The pages now carry a
// cross-domain canonical; this adds the header-level defense, which also covers
// non-HTML responses that cannot carry a <link> tag.
//
// The header is scoped to *.pages.dev by hostname. It must never appear on the
// custom domain -- a noindex there would deindex the real site.
export async function onRequest(context) {
  const response = await context.next();
  const hostname = new URL(context.request.url).hostname;
  if (!hostname.endsWith('.pages.dev')) return response;
  const tagged = new Response(response.body, response);
  tagged.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return tagged;
}
