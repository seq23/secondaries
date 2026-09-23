// Pins functions/_middleware.js both ways: repo-internal files answer 404 on every host, and every
// page and asset the public site actually uses still passes through. Runs in plain node (no server).
import { onRequest, isInternalPath } from "../functions/_middleware.js";
import fs from "node:fs";

const PUBLIC = ["/", "/index.html", "/standards", "/standards.html", "/app.js", "/styles.css",
  "/assets/wp-logo.png", "/robots.txt", "/sitemap.xml", "/_headers-not-a-real-page"];
const INTERNAL = ["/RUNBOOK.md", "/AGENTS.md", "/README.md", "/IMPLEMENTATION_PLAN.md", "/package.json",
  "/package-lock.json", "/playwright.config.js", "/scripts/validate_runbook.mjs", "/tests/middleware.check.mjs",
  "/functions/_middleware.js", "/.github/workflows/validate.yml", "/.gitignore", "/follow-on.patch",
  "/runbook.MD", "/%52UNBOOK.md", "/scripts/"];

// Every file the pages reference must stay public — read from the HTML, not a list kept by hand.
for (const f of ["index.html", "standards.html"]) {
  for (const m of fs.readFileSync(f, "utf8").matchAll(/(?:src|href)="([^"#:]+)"/g)) PUBLIC.push("/" + m[1].replace(/^\//, ""));
}

const errors = [];
let n = 0;
async function hit(host, path) {
  let passedThrough = false;
  const ctx = { request: new Request(`https://${host}${path}`), next: async () => { passedThrough = true; return new Response("ok", { status: 200 }); } };
  const res = await onRequest(ctx);
  n++;
  return { res, passedThrough };
}
for (const host of ["venturedeals.joinwestpeek.com", "secondaries.pages.dev"]) {
  for (const p of INTERNAL) {
    const { res, passedThrough } = await hit(host, p);
    if (res.status !== 404 || passedThrough) errors.push(`${host}${p} should be 404 and never reach the asset; got ${res.status}`);
  }
  for (const p of new Set(PUBLIC)) {
    const { res, passedThrough } = await hit(host, p);
    if (res.status !== 200 || !passedThrough) errors.push(`${host}${p} should pass through; got ${res.status}`);
    const robots = res.headers.get("x-robots-tag");
    if (host.endsWith(".pages.dev") ? robots !== "noindex, nofollow" : robots) errors.push(`${host}${p} X-Robots-Tag wrong: ${robots}`);
  }
}
if (n === 0 || !isInternalPath("/RUNBOOK.md")) errors.push("examined nothing");
console.log(`middleware: ${n} request(s) checked`);
if (errors.length) { console.error("test:middleware FAILED"); for (const e of errors) console.error(`  - ${e}`); process.exit(1); }
console.log("test:middleware PASS");
