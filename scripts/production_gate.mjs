// THE PRODUCTION GATE — what may reach production, decided where the deploy runs.
//
// Owner decision, 2 Oct 2026 (asked and answered): the browser suite (`e2e.yml`) runs ON DEMAND
// ONLY, and a SMALL change ships to production on the fast check alone. E2e gates production only
// after a LARGE change, or when asked. Until then this repo's production workflow refused any sha
// without a green e2e run, so a small change sat on staging waiting for a suite nothing would run.
//
// The rule, in one place (the production workflow runs this file; it restates none of it):
//   1. A sha with a successful e2e run on exactly it may ship. That is the path after a LARGE
//      change: `land` dispatches the suite, and its success fires the production workflow.
//   2. Otherwise the caller must give a REASON — `land`'s small-change verdict, which `land <pr>`
//      passes when it dispatches the production workflow — and then BOTH must hold:
//        a. the fast check (validate.yml) concluded success on exactly this sha;
//        b. the suite is not KNOWN RED: the newest e2e run on main that reached a verdict is
//           `success`, or no run ever reached one. Cancelled and skipped runs are not verdicts
//           (e2e.yml cancels a superseded dispatch by design) and are passed over.
//   3. Anything that cannot be read is a refusal, never a pass (fail closed).
//
// WHAT "LARGE" MEANS IS NOT DEFINED HERE, on purpose. There is one definition: the `large` block
// of `land` in seq23/seq-bin (~/bin/land; tests/test-land-large.sh pins it). `land` measures the
// change and every commit production has not seen, and only then names it small. This file checks
// what a workflow can check for itself; restating land's thresholds here would be a second list,
// free to drift from the first.
//
//   SHA=<sha> [REASON=<why>] GH_TOKEN=… GITHUB_REPOSITORY=owner/repo node scripts/production_gate.mjs
//   node scripts/production_gate.mjs --self-test
import fs from 'node:fs';

const E2E_WF = process.env.GATE_E2E_WF || 'e2e.yml';
const FAST_WF = process.env.GATE_FAST_WF || 'validate.yml';
const NOT_A_VERDICT = new Set(['cancelled', 'skipped']);

// The newest e2e run on main that reached a verdict. `runs` is GitHub's list, newest first.
export function lastVerdict(runs) {
  if (!Array.isArray(runs)) return null; // unread
  const v = runs.find((r) => r && r.status === 'completed' && r.conclusion && !NOT_A_VERDICT.has(r.conclusion));
  return v ? { conclusion: String(v.conclusion), id: v.id, sha: v.head_sha } : { conclusion: 'none' };
}

// Pure. e2eGreenOnSha / fastGreenOnSha are booleans read from the API (anything else = unread);
// last is lastVerdict()'s answer (null = unread); reason is the caller's small-change verdict.
export function decide({ e2eGreenOnSha, reason, fastGreenOnSha, last }) {
  if (e2eGreenOnSha === true) return { ok: true, why: `${E2E_WF} green on this sha` };
  if (e2eGreenOnSha !== false) return { ok: false, why: `whether ${E2E_WF} passed on this sha could not be read — refused, fail closed` };
  const why = String(reason || '').replace(/\s+/g, ' ').trim();
  if (!why) return { ok: false, why: `no successful ${E2E_WF} run on this sha, and no reason given. A small change is shipped by \`land <pr>\`, which passes its verdict as the reason; a large one needs the suite first: gh workflow run ${E2E_WF} --ref main` };
  if (fastGreenOnSha !== true) return { ok: false, why: `the fast check (${FAST_WF}) has no successful run on this sha — a small change ships on a GREEN fast check, not instead of one` };
  if (!last || typeof last.conclusion !== 'string') return { ok: false, why: `the ${E2E_WF} history on main could not be read, so "not known red" is unproven — refused, fail closed` };
  if (last.conclusion !== 'success' && last.conclusion !== 'none') {
    return { ok: false, why: `KNOWN RED: the newest ${E2E_WF} verdict on main is ${last.conclusion}${last.id ? ` (run ${last.id})` : ''} and no green run is newer. A small change is never shipped past a known-red suite. Fix main, then run the suite: gh workflow run ${E2E_WF} --ref main` };
  }
  return { ok: true, why: `fast check green, ${E2E_WF} not known red (last verdict: ${last.conclusion}) — ${why}` };
}

// --- self-test: every branch, then each rule broken and proven caught -----------------------------
const RUN = (conclusion, id = 1, status = 'completed') => ({ status, conclusion, id, head_sha: 'a'.repeat(40) });
const SMALL = 'land #7, small change: 12 lines, 1 files; shipped on the fast check, e2e on demand';
const GREEN = { conclusion: 'success' };
export const CASES = [
  // [name, input, expected ok]
  ['e2e green on the sha: ships, no reason needed', { e2eGreenOnSha: true, reason: '', fastGreenOnSha: false, last: null }, true],
  ['e2e green on the sha: ships even while an OLDER run is red', { e2eGreenOnSha: true, reason: '', fastGreenOnSha: true, last: { conclusion: 'failure' } }, true],
  ['no green e2e and no reason: refused', { e2eGreenOnSha: false, reason: '', fastGreenOnSha: true, last: GREEN }, false],
  ['a reason of only spaces is no reason', { e2eGreenOnSha: false, reason: '  \n ', fastGreenOnSha: true, last: GREEN }, false],
  ['small change, fast check green, last verdict green: ships', { e2eGreenOnSha: false, reason: SMALL, fastGreenOnSha: true, last: GREEN }, true],
  ['small change, no e2e run ever reached a verdict: ships', { e2eGreenOnSha: false, reason: SMALL, fastGreenOnSha: true, last: lastVerdict([]) }, true],
  ['small change but the fast check is not green on the sha: refused', { e2eGreenOnSha: false, reason: SMALL, fastGreenOnSha: false, last: GREEN }, false],
  ['small change, fast check unread: refused', { e2eGreenOnSha: false, reason: SMALL, fastGreenOnSha: undefined, last: GREEN }, false],
  ['small change, suite KNOWN RED (failure): refused', { e2eGreenOnSha: false, reason: SMALL, fastGreenOnSha: true, last: lastVerdict([RUN('failure', 9), RUN('success', 8)]) }, false],
  ['small change, suite KNOWN RED (timed_out): refused', { e2eGreenOnSha: false, reason: SMALL, fastGreenOnSha: true, last: lastVerdict([RUN('timed_out', 9)]) }, false],
  ['small change, a green run NEWER than the red one clears it', { e2eGreenOnSha: false, reason: SMALL, fastGreenOnSha: true, last: lastVerdict([RUN('success', 9), RUN('failure', 8)]) }, true],
  ['a cancelled run is passed over: the red under it still blocks', { e2eGreenOnSha: false, reason: SMALL, fastGreenOnSha: true, last: lastVerdict([RUN('cancelled', 9), RUN('failure', 8)]) }, false],
  ['a cancelled run is passed over: the green under it still ships', { e2eGreenOnSha: false, reason: SMALL, fastGreenOnSha: true, last: lastVerdict([RUN('cancelled', 9), RUN('success', 8)]) }, true],
  ['a run still in flight proves nothing: the red under it blocks', { e2eGreenOnSha: false, reason: SMALL, fastGreenOnSha: true, last: lastVerdict([RUN(null, 9, 'in_progress'), RUN('failure', 8)]) }, false],
  ['e2e history unread: refused, fail closed', { e2eGreenOnSha: false, reason: SMALL, fastGreenOnSha: true, last: lastVerdict(undefined) }, false],
  ['whether e2e passed on the sha is unread: refused, fail closed', { e2eGreenOnSha: undefined, reason: SMALL, fastGreenOnSha: true, last: GREEN }, false],
  ['a verdict word this does not know is not "not red"', { e2eGreenOnSha: false, reason: SMALL, fastGreenOnSha: true, last: { conclusion: 'action_required' } }, false],
];
// Each mutant breaks ONE rule; the table above must disagree with it at least once.
const MUTANTS = [
  ['ships past a known-red suite', (i) => (i.e2eGreenOnSha === false && i.reason.trim() && i.fastGreenOnSha === true && i.last ? { ok: true } : decide(i))],
  ['ships a small change without a green fast check', (i) => decide({ ...i, fastGreenOnSha: true })],
  ['ships without e2e or a reason', (i) => decide({ ...i, reason: i.reason.trim() || 'x' })],
  ['reads an unread history as not red', (i) => decide({ ...i, last: i.last || GREEN })],
  ['keeps cancelled runs as verdicts', (i) => decide(i), (runs) => { const v = runs.find((r) => r.status === 'completed'); return v ? { conclusion: v.conclusion } : { conclusion: 'none' }; }],
];
export function selfTest() {
  const wrong = CASES.filter(([, input, want]) => decide(input).ok !== want).map(([name]) => name);
  const uncaught = [];
  for (const [name, fn, verdictFn] of MUTANTS) {
    let caught = CASES.some(([, input, want]) => fn(input).ok !== want);
    if (verdictFn) caught = verdictFn([RUN('cancelled', 9), RUN('failure', 8)]).conclusion !== lastVerdict([RUN('cancelled', 9), RUN('failure', 8)]).conclusion;
    if (!caught) uncaught.push(name);
  }
  return { cases: CASES.length, wrong, mutants: MUTANTS.length, uncaught };
}

async function api(path) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/${path}`, {
    headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`GET ${path} answered ${res.status}`);
  return res.json();
}

async function main() {
  if (process.argv.includes('--self-test')) {
    const r = selfTest();
    if (r.cases === 0 || r.mutants === 0) { console.error('production-gate self-test: examined nothing (Rule 0)'); process.exit(1); }
    if (r.wrong.length || r.uncaught.length) {
      for (const w of r.wrong) console.error(`  FAIL ${w}`);
      for (const u of r.uncaught) console.error(`  FAIL negative proof: a gate that ${u} passes every case`);
      console.error('production-gate self-test FAILED'); process.exit(1);
    }
    console.log(`production-gate self-test: ${r.cases}/${r.cases} cases decided correctly; ${r.mutants}/${r.mutants} broken gates caught`);
    return;
  }
  const sha = process.env.SHA || '';
  const reason = process.env.REASON || '';
  if (!/^[0-9a-f]{40}$/.test(sha) || !process.env.GITHUB_REPOSITORY) { console.error('PRODUCTION GATE: REFUSED — SHA (40 hex) and GITHUB_REPOSITORY are required'); process.exit(1); }
  let input;
  try {
    const e2eGreenOnSha = (await api(`actions/workflows/${E2E_WF}/runs?head_sha=${sha}&status=success&per_page=1`)).total_count >= 1;
    input = { e2eGreenOnSha, reason, fastGreenOnSha: undefined, last: null };
    if (!e2eGreenOnSha && reason.trim()) {
      input.fastGreenOnSha = (await api(`actions/workflows/${FAST_WF}/runs?head_sha=${sha}&status=success&per_page=1`)).total_count >= 1;
      input.last = lastVerdict((await api(`actions/workflows/${E2E_WF}/runs?branch=main&status=completed&per_page=30`)).workflow_runs);
    }
  } catch (e) {
    console.error(`PRODUCTION GATE: REFUSED — could not read GitHub (${e.message}); an unanswered question is not a pass`);
    process.exit(1);
  }
  const d = decide(input);
  const line = `PRODUCTION GATE: ${d.ok ? 'ok' : 'REFUSED'} — ${sha.slice(0, 7)}: ${d.why}`;
  if (!d.ok) { console.error(`::error::${line}`); process.exit(1); }
  console.log(line);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `note=${d.why.replace(/[\r\n]+/g, ' ')}\n`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${fs.realpathSync(process.argv[1])}`).href) await main();
