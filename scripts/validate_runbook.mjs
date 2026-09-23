// RUNBOOK.md is read by AI employees at plan time. A runbook naming a path or script that no
// longer exists sends the reader to the wrong place, so this fails the build the moment they
// drift. Hard-fails on a runbook that names nothing. This site is served from the repo root, so
// root files (index.html, app.js, _headers, ...) are checked as well as the top-level dirs.
import fs from "node:fs";
if (!fs.existsSync("RUNBOOK.md")) { console.error("validate:runbook FAILED\n  - RUNBOOK.md is missing at the repo root"); process.exit(1); }
const md = fs.readFileSync("RUNBOOK.md", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const dirPaths = [...md.matchAll(/`((?:tests|scripts|functions|assets|screenshots|\.github)\/[^`#\s]*)`/g)].map((m) => m[1]);
const rootFiles = [...md.matchAll(/`([A-Za-z0-9_.-]+\.(?:html|js|mjs|css|md|txt|xml|json|png)|_headers|_redirects)`/g)].map((m) => m[1]);
const paths = [...new Set([...dirPaths, ...rootFiles])].filter((p) => !p.includes("<"));
const scripts = [...new Set([...md.matchAll(/`npm (?:run ([a-z:-]+)|(test))`/g)].map((m) => m[1] || m[2]))];
const errors = [];
if (!paths.length || !scripts.length) errors.push("RUNBOOK.md names no paths or no npm scripts");
for (const p of paths) if (!fs.existsSync(p)) errors.push(`RUNBOOK.md names ${p}, which does not exist`);
for (const s of scripts) if (!pkg.scripts?.[s]) errors.push(`RUNBOOK.md names npm ${s === "test" ? "" : "run "}${s}, which package.json does not define`);
console.log(`runbook: ${paths.length} path(s) and ${scripts.length} script(s) verified`);
if (errors.length) { console.error("validate:runbook FAILED"); for (const e of errors) console.error(`  - ${e}`); process.exit(1); }
console.log("validate:runbook PASS");
