// This site is served straight from the repo root, so every file in the repo is a public URL unless
// something says otherwise. On 23 Sep 2026 https://venturedeals.joinwestpeek.com/ was serving
// RUNBOOK.md, AGENTS.md, IMPLEMENTATION_PLAN.md, package.json and scripts/ to anyone who asked, and a
// stray 841 KB follow-on.patch before that. Repo-internal files answer 404 here, on every host,
// before the asset is read. tests/middleware.check.mjs pins the list both ways (internal files 404,
// every page and asset the site uses still 200).
const INTERNAL = [
  /^\/(scripts|tests|functions|node_modules|\.github|\.wrangler)(\/|$)/i,
  /\.(md|patch|diff|mjs|log)$/i,
  /^\/(package|package-lock)\.json$/i,
  /^\/playwright\.config\.js$/i,
  /^\/\.[^/]*$/, // dotfiles at the root (.gitignore, .env*)
];

export function isInternalPath(pathname) {
  let p = pathname;
  try { p = decodeURIComponent(pathname); } catch { /* keep the raw path */ }
  return INTERNAL.some((re) => re.test(p));
}

// The *.pages.dev preview host serves the same pages as the custom domain and
// sets no canonical of its own, so search engines can index the preview URL as
// a competing copy of venturedeals.joinwestpeek.com. The pages now carry a
// cross-domain canonical; this adds the header-level defense, which also covers
// non-HTML responses that cannot carry a <link> tag.
//
// The header is scoped to *.pages.dev by hostname. It must never appear on the
// custom domain -- a noindex there would deindex the real site.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (isInternalPath(url.pathname)) {
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }
  const response = await context.next();
  if (!url.hostname.endsWith('.pages.dev')) return response;
  const tagged = new Response(response.body, response);
  tagged.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return tagged;
}
