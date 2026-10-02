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
- **The repo root IS the site, so repo-internal files are blocked at the edge.** `functions/_middleware.js`
  answers 404 for `*.md`, `package.json`, `scripts/`, `tests/`, `functions/`, `.github/` and root
  dotfiles on every host (23 Sep 2026: RUNBOOK.md, AGENTS.md and package.json were publicly served).
  A new internal file type goes on that list; a new public file must not match it. Unknown paths get
  `404.html` with a real 404 status, never the home page.
- **Crawlers are welcome** (`robots.txt`, citation-first). Do not add blanket Disallow rules.
- **Merge only on all-green checks**, never `--admin`, never force-pushed (`AGENTS.md`).
- **Decisions an employee must ask, not make**: brand or colour, copy meaning, the advice
  disclaimer, any change to a formula's financial meaning. Layout, CSS, tests, validators, headers,
  redirects: decide, record on the card, keep going.

## How to make a change
1. Branch `work/<slug>` off `main`.
2. Edit the root files (`index.html`, `app.js`, `styles.css`, ...). A formula change needs a
   Playwright assertion in `tests/` that pins the new number.
3. Validate — the merge gate `.github/workflows/validate.yml` runs on the PR:
   - `npm run lint` (syntax check of `app.js`)
   - `npm run validate:runbook`
   - `npm run validate:workflows` (Playwright stays on demand only — `workflow_dispatch`, no cron; production moves only by promote, through the production gate)
   - `npm run validate:gate` (the production gate decides every case correctly)
   - `npm run test:middleware` (internal files 404, every public page and asset passes)
   And ONLY if your change touches what it covers — in CI it runs on demand only, never per merge
   and never on a schedule:
   - `npm run test:playwright` (serves the root on :4173 via `python3 -m http.server`;
     `scripts/playwright_preflight.mjs` first launches the exact Chromium the suite uses and, if it
     will not start, prints the fix: `npx playwright install --force chromium` (`--force` matters:
     a truncated install marked complete is otherwise skipped). Or point `PLAYWRIGHT_CHROMIUM_PATH`
     at an installed Chromium — `playwright.config.js` honours it. `@playwright/test` is pinned
     exactly, to the version west-peek-os and boss-os use, so this Mac shares one browser cache)
   `npm test` runs lint, the middleware test and Playwright together.
4. Look at it: `python3 -m http.server 4173` from the root, open each tab at desktop and 390px.
5. Commit, push, open a PR. Cloudflare Pages posts a preview URL
   (`https://<hash>.secondaries.pages.dev`) on the PR — check the change there.
6. `~/bin/land <pr>` verifies green, squash-merges, watches `main`.
7. Prove it on staging: the "Cloudflare Pages" check-run on the merge commit succeeded
   (`gh api repos/seq23/secondaries/commits/<sha>/check-runs`), then
   `curl -s https://main.secondaries.pages.dev/ | grep <something you changed>`. `land <pr>` then
   ships production in the same run (below): a small change at once, on the fast check; a large
   one after it has run the Playwright suite on `main` and seen it green.

## How it deploys (build first, test in batches — 26 Sep 2026)
- **Staging = `main`.** Cloudflare Pages Git integration builds every push to `main` as the preview
  https://main.secondaries.pages.dev (repo root, no build step).
- **Production = the `production` branch** (venturedeals.joinwestpeek.com). Only `.github/workflows/promote.yml`
  moves it, and every path goes through `scripts/production_gate.mjs` (owner decision 2 Oct 2026):
  - **A small change ships on the fast check.** `land <pr>` merges, sees `.github/workflows/validate.yml`
    green on the merge commit, and dispatches promote with the sha and its reason ("small change:
    N lines, M files; shipped on the fast check, e2e on demand"). The gate requires the fast check
    green on exactly that sha and the suite not known red.
  - **A large change needs a green Playwright run.** `land` measures the change — and every commit
    production has not seen — and, when one is large, dispatches `.github/workflows/e2e.yml` on
    `main` itself; its success fires promote for that sha. **"Large" is defined once, in the
    `large` block of `land` (seq23/seq-bin, `~/bin/land`); nothing here restates it.**
  - **Known red blocks.** If the newest e2e run on `main` that reached a verdict (cancelled and
    skipped runs do not count) is not `success`, no small change ships until a green run is newer.
  - `e2e.yml` runs ON DEMAND ONLY (supersedes the 26 Sep nightly): a person
    (`gh workflow run e2e.yml --ref main`), `land <pr> --run-e2e`, `land --promote secondaries --run-e2e`,
    or `land` after a large change. There is no cron: `scripts/validate_workflows.mjs` fails the
    merge gate if one comes back.
  - Each promote records a GitHub Deployment (environment `production`):
    `gh api "repos/seq23/secondaries/deployments?environment=production&per_page=1" --jq '.[0].sha'`
    is what production runs.
- **Promote by hand**: `gh workflow run e2e.yml --ref main` (runs the suite on main's head; green →
  promote fires), or `gh workflow run promote.yml -f sha=<sha>` for a sha that already has a green
  run. Without one, promote refuses unless it is given `-f reason=` — that is `land`'s call to make.
- A red e2e run leaves production where it is; fix main first. No manual deploy, no `wrangler deploy`.

## Guards, and what each pins
| Guard | Pins |
|---|---|
| `.github/workflows/validate.yml` | the merge gate: lint, runbook + workflow guards, middleware test on every PR and on `main` (~40 s) |
| `.github/workflows/e2e.yml` | the Playwright suite, `workflow_dispatch` only (a person, `land --promote --run-e2e`, or `land` after a large change; no cron) — gates production, never the merge |
| `.github/workflows/promote.yml` | fast-forwards `production` to a sha the production gate passes (auto on e2e success; dispatched by `land` with a reason for a small change) and records the GitHub Deployment |
| `scripts/production_gate.mjs` | what may reach production: a green e2e on the sha; or a reason + the fast check green on the sha + the suite not known red. Unreadable = refused. `npm run validate:gate` runs its table (17 cases, 5 broken gates) |
| `scripts/validate_workflows.mjs` | `validate.yml` never runs Playwright; `e2e.yml` triggers are exactly `workflow_dispatch` (any `schedule` cron fails), with a ceiling; `promote.yml` fires on e2e, turns a red run away, runs the gate on every path, takes `sha` + `reason`, records the deployment; the gate points at `land` for "large" and restates no threshold |
| `npm run lint` | `app.js` parses |
| `scripts/playwright_preflight.mjs` | Chromium launches before any spec runs; a broken browser install fails once, with the fix command, not as N opaque spec failures |
| `tests/follow-on-decision.spec.js` | Follow-On Decision: four paths, IC recommendation, constraint disqualification, share-count dilution warnings |
| `tests/primary-fund-return.spec.js` | Primary Deals fund-return waterfall and every verdict state |
| `tests/middleware.check.mjs` | repo-internal files answer 404 on both hosts; every page and asset `index.html`/`standards.html` reference still passes; `X-Robots-Tag` only on `*.pages.dev` |
| `scripts/validate_runbook.mjs` | this file names real paths and scripts |

Prove a new guard negatively before merging: plant the defect, watch it fail, remove it.
