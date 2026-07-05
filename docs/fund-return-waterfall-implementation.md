# Fund Return Waterfall Implementation Packet

Status: ready for code implementation
Issue: #1

## Required app change

The Primary Deals tab must make the investor return workflow impossible to miss:

Investment → Ownership → Dilution → Exit → Fund Return

The current `index.html` Primary Deals return card is titled `Return math`. Replace that card with a stronger section titled:

`9. What Return Could Our Fund Make?`

The section must include:

- warning copy: `Always calculate Investment → Ownership → Dilution → Exit → Fund Return. Do not approve on company quality alone. Great company ≠ great fund investment.`
- visible waterfall labels and output values
- existing return outputs
- new fund-return verdict output

## Required DOM IDs

Add these IDs in `index.html`:

- `pWaterfallInvestment`
- `pWaterfallOwnership`
- `pWaterfallDilution`
- `pWaterfallExit`
- `pWaterfallFundReturn`
- `pFundReturnVerdict`

## Required app.js logic

Inside `recalculatePrimary()`, after `fundContribution` is calculated, add:

```js
let fundReturnVerdict = 'Not enough fund impact yet';
let fundReturnVerdictClass = 'negative';

if (fundContribution >= 1) {
  fundReturnVerdict = 'Fund-returning potential';
  fundReturnVerdictClass = 'positive';
} else if (fundContribution >= 0.25) {
  fundReturnVerdict = 'Meaningful fund contributor';
  fundReturnVerdictClass = 'warning';
}
```

Then set:

```js
setText('pWaterfallInvestment', currency(check));
setText('pWaterfallOwnership', percent(ownership));
setText('pWaterfallDilution', percent(num('pFutureDilution')));
setText('pWaterfallExit', currency(num('pExitValue')));
setText('pWaterfallFundReturn', `${multiple(fundContribution)} of fund`);
setText('pFundReturnVerdict', fundReturnVerdict, fundReturnVerdictClass);
```

Also add a scoring penalty:

```js
if (fundContribution < 0.25) { score -= 12; reasons.push('not enough fund-level impact'); }
```

## Required memo row

Add this to `pMemoBody`:

```js
['Fund return case', `This deal returns ${multiple(fundContribution)} of fund at ${currency(num('pExitValue'))} exit after ${percent(num('pFutureDilution'))} future dilution.`]
```

Upgrade the existing Return case row to include fund contribution:

```js
['Return case', `${currency(num('pExitValue'))} exit produces ${multiple(netMoic)} net MOIC, ${percent(annualized)} annualized, and ${multiple(fundContribution)} of fund.`]
```

## Validation

Run local browser validation or Playwright after implementation:

1. Open the app locally.
2. Click Primary Deals.
3. Change `pCheckSize`, `pFundSize`, `pExitValue`, and `pFutureDilution`.
4. Confirm ownership, exit ownership, gross proceeds, net proceeds, fund contribution, and verdict update.
5. Confirm memo includes `Fund return case`.
6. Confirm CSV export and Print/PDF still work.
7. Confirm Secondary Deals and Fund Math still work.

## ChatGPT connector boundary

The ChatGPT GitHub connector can create branches, files, issues, PRs, and whole-file updates, but it does not run local code or Playwright. Its source-file update action requires complete whole-file replacement, so do not perform partial destructive source writes unless the complete current file content is safely reconstructed first.

## Codex handoff command

Use this exact Codex instruction against `seq23/secondaries`:

```text
Implement Issue #1. Use the acceptance criteria in docs/fund-return-waterfall-implementation.md. Modify index.html and app.js only unless tests require minimal Playwright setup. Run local validation and Playwright if available. Open a PR with screenshots/artifacts and validation results. Do not commit directly to main.
```
