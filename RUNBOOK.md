# RUNBOOK — secondaries (venture deal math dashboards)

Read this before changing anything. It is the file an AI employee (Porter in West Peek OS,
Danielle in Boss OS) reads at plan time; `scripts/validate_runbook.mjs` fails the build if the
paths and scripts named here stop existing.

## What this repo is
One static site: the West Peek venture deal math dashboards (Overview, Secondary Deals, Primary
Deals, Follow-On Decision, Fund Math). Partners call it "venture deals", "secondaries", "the
secondaries site/page", "deal math dashboards" or "the fund math calculator".

| | |
|---|---|
| Host | Cloudflare **Pages** project `secondaries` (not a Worker) |
| Public URL | https://venturedeals.joinwestpeek.com (custom domain), plus secondaries.pages.dev |
| Source | the **repo root** is the site — no build step, no `dist/` |
| Pages | `index.html` (all five dashboards as tabs), `standards.html` (`/standards`) |
| Logic / style | `app.js` (all calculators), `styles.css`, `assets/wp-logo.png` |
| Edge | `_headers` (security headers), `_redirects`, `functions/_middleware.js` |
| SEO | `robots.txt`, `sitemap.xml`, `<link rel="canonical">` in each page |
| Tests | `tests/` (Playwright), config `playwright.config.js` |

Every file at the root is publicly served, including this one. Never commit anything private here.

## Standing rules (what the repo's own docs and code state)
- **Decision-support, not advice** (`README.md`, `IMPLEMENTATION_PLAN.md`): the calculators are not
  legal, tax, accounting, valuation or investment advice, and the follow-on ranking must never be
  presented as autonomous investment advice. Do not remove or soften that wording without the owner.
- **No build system, no runtime dependencies** (`README.md`). `@playwright/test` is a dev dependency
  only. Do not add a bundler or a framework.
- **Each dashboard keeps its own browser-saved assumptions**; the global buttons (reset, clear, CSV
  export, print) act on the active tab only (`README.md`). A new calculator follows the same pattern.
- **The custom domain is canonical.** `functions/_middleware.js` adds `X-Robots-Tag: noindex` on
  `*.pages.dev` only; it must never apply to venturedeals.joinwestpeek.com. New pages carry a
  canonical to `https://venturedeals.joinwestpeek.com/...` and a line in `sitemap.xml`.
- **Crawlers are welcome** (`robots.txt`, citation-first). Do not add blanket Disallow rules.
- **Merge only on all-green checks**, never `--admin`, never force-pushed (`AGENTS.md`).
- **Decisions an employee must ask, not make**: brand or colour, copy meaning, the advice
  disclaimer, any change to a formula's financial meaning. Layout, CSS, tests, validators, headers,
  redirects: decide, record on the card, keep going.

## How to make a change
1. Branch `work/<slug>` off `main`.
2. Edit the root files (`index.html`, `app.js`, `styles.css`, ...). A formula change needs a
   Playwright assertion in `tests/` that pins the new number.
3. Validate — the same three steps `.github/workflows/validate.yml` runs on the PR:
   - `npm run lint` (syntax check of `app.js`)
   - `npm run validate:runbook`
   - `npm run test:playwright` (serves the root on :4173 via `python3 -m http.server`;
     first time on a machine: `npx playwright install chromium`, or point
     `PLAYWRIGHT_CHROMIUM_PATH` at an installed Chromium — `playwright.config.js` honours it)
   `npm test` runs lint + Playwright together.
4. Look at it: `python3 -m http.server 4173` from the root, open each tab at desktop and 390px.
5. Commit, push, open a PR. Cloudflare Pages posts a preview URL
   (`https://<hash>.secondaries.pages.dev`) on the PR — check the change there.
6. `~/bin/land <pr>` verifies green, squash-merges, watches `main`.
7. Prove it live: the "Cloudflare Pages" check-run on the merge commit succeeded
   (`gh api repos/seq23/secondaries/commits/<sha>/check-runs`), then
   `curl -s https://venturedeals.joinwestpeek.com/ | grep <something you changed>`.

## How it deploys
Cloudflare Pages Git integration builds `main` on every push and publishes the repo root to
venturedeals.joinwestpeek.com — no manual deploy, no `wrangler deploy`. PRs get preview
deployments only. A red "Cloudflare Pages" check on `main` means production did not update.

## Guards, and what each pins
| Guard | Pins |
|---|---|
| `.github/workflows/validate.yml` | runs lint, runbook check and Playwright on every PR and on `main` |
| `npm run lint` | `app.js` parses |
| `tests/follow-on-decision.spec.js` | Follow-On Decision: four paths, IC recommendation, constraint disqualification, share-count dilution warnings |
| `tests/primary-fund-return.spec.js` | Primary Deals fund-return waterfall and every verdict state |
| `scripts/validate_runbook.mjs` | this file names real paths and scripts |

Prove a new guard negatively before merging: plant the defect, watch it fail, remove it.
