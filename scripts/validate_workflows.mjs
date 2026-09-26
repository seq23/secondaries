// The browser journey runs nightly, never per merge; production moves only by promote.
//
// Build first, test in batches (26 Sep 2026): `validate.yml` is the merge gate and may not run
// Playwright; `e2e.yml` runs it, with a ceiling, ONLY on schedule + workflow_dispatch; and
// `promote.yml` is what moves the `production` branch, on e2e's success. A workflow file is a
// specification code must read, or the shape drifts back the first time someone "just adds the
// e2e step to CI". Hard-fails on zero workflow files (Rule 0).
//
//   node scripts/validate_workflows.mjs            # the real files
//   node scripts/validate_workflows.mjs --self-test
import fs from 'node:fs';

const DIR = '.github/workflows';
const PLAYWRIGHT = /playwright|test:playwright/i;

export function triggersIn(yaml) {
  const lines = yaml.split('\n').map((l) => l.replace(/\s#.*$/, ''));
  const start = lines.findIndex((l) => /^on:\s*$/.test(l));
  if (start < 0) return [];
  const out = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '') continue;
    if (!line.startsWith(' ')) break;
    const m = line.match(/^  ([A-Za-z_]+):/);
    if (m) out.push(m[1]);
  }
  return out;
}
const stepsOf = (yaml) => yaml.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

export function check(files) {
  const errors = [];
  const names = Object.keys(files);
  if (names.length === 0) return [`${DIR} has no workflow files (Rule 0: nothing to check)`];
  const gate = files['validate.yml'];
  const e2e = files['e2e.yml'];
  const promote = files['promote.yml'];
  if (!gate) errors.push('validate.yml (the merge gate) is missing');
  else {
    if (PLAYWRIGHT.test(stepsOf(gate))) errors.push('validate.yml runs the browser journey — it belongs in e2e.yml, nightly, never per merge');
    for (const t of ['pull_request', 'push']) if (!triggersIn(gate).includes(t)) errors.push(`validate.yml no longer runs on ${t} — the merge gate must run per PR and on main`);
  }
  if (!e2e) errors.push('e2e.yml is missing — the browser journey runs nowhere. Nightly means nightly, not never');
  else {
    const tr = triggersIn(e2e);
    for (const bad of ['push', 'pull_request', 'pull_request_target']) if (tr.includes(bad)) errors.push(`e2e.yml triggers on ${bad} — the journey is back on the merge path; only schedule and workflow_dispatch`);
    if (!tr.includes('schedule')) errors.push('e2e.yml has no schedule trigger');
    if (!tr.includes('workflow_dispatch')) errors.push('e2e.yml has no workflow_dispatch trigger');
    if (!PLAYWRIGHT.test(stepsOf(e2e))) errors.push('e2e.yml has no Playwright step (Rule 0: a nightly that tests nothing)');
    if (!/^\s+timeout-minutes:\s*\d+/m.test(e2e)) errors.push('e2e.yml job has no timeout-minutes — a hung nightly runs for six hours');
  }
  if (!promote) errors.push('promote.yml is missing — nothing moves the production branch');
  else {
    if (!/workflow_run:[\s\S]*workflows:\s*\[e2e\]/.test(promote)) errors.push('promote.yml does not fire on the e2e workflow');
    if (!/refs\/heads\/production/.test(promote)) errors.push('promote.yml does not push the production branch');
    if (!/workflow_run\.conclusion == 'success'/.test(promote)) errors.push('promote.yml does not require e2e success — a red nightly would ship');
  }
  return errors;
}

function load() {
  if (!fs.existsSync(DIR)) return {};
  return Object.fromEntries(fs.readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f)).map((f) => [f, fs.readFileSync(`${DIR}/${f}`, 'utf8')]));
}

if (process.argv.includes('--self-test')) {
  const good = load();
  const cases = [
    ['the shipped shape passes', good, 0],
    ['journey back in the gate', { ...good, 'validate.yml': good['validate.yml'] + '\n      - run: npm run test:playwright\n' }, 1],
    ['e2e.yml on push', { ...good, 'e2e.yml': good['e2e.yml'].replace('\non:\n', '\non:\n  push:\n    branches: [main]\n') }, 1],
    ['e2e.yml on pull_request', { ...good, 'e2e.yml': good['e2e.yml'].replace('\non:\n', '\non:\n  pull_request:\n') }, 1],
    ['e2e.yml without a schedule', { ...good, 'e2e.yml': good['e2e.yml'].replace(/^  schedule:\n(?:    .*\n)+/m, '') }, 1],
    ['e2e.yml without a ceiling', { ...good, 'e2e.yml': good['e2e.yml'].replace(/^\s+timeout-minutes:.*\n/m, '') }, 1],
    ['promote.yml that ships on any e2e conclusion', { ...good, 'promote.yml': good['promote.yml'].replace("|| github.event.workflow_run.conclusion == 'success'", '') }, 1],
    ['Rule 0: e2e.yml missing', Object.fromEntries(Object.entries(good).filter(([k]) => k !== 'e2e.yml')), 1],
    ['Rule 0: no workflows at all', {}, 1],
  ];
  let wrong = 0;
  for (const [name, files, min] of cases) {
    const e = check(files);
    const ok = min === 0 ? e.length === 0 : e.length >= min;
    if (!ok) { wrong++; console.error(`  FAIL ${name}: ${e.length} error(s) ${e.join(' | ')}`); }
  }
  if (wrong) { console.error(`validate:workflows self-test: ${wrong} case(s) wrong`); process.exit(1); }
  console.log(`validate:workflows self-test: ${cases.length}/${cases.length} fixtures detected correctly`);
  process.exit(0);
}

const errors = check(load());
if (errors.length) { console.error('validate:workflows FAILED'); for (const e of errors) console.error(`  - ${e}`); process.exit(1); }
console.log('validate:workflows PASS — merge gate has no browser journey; e2e.yml is schedule + dispatch only; promote.yml moves production on e2e green');
