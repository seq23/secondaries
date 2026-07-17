const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
async function loadDashboard(page) {
  if (process.env.PLAYWRIGHT_USE_INLINE === '1') {
    await page.evaluate(() => {
      const store = {};
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
          getItem: (key) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
          setItem: (key, value) => { store[key] = String(value); },
          removeItem: (key) => { delete store[key]; },
          clear: () => { Object.keys(store).forEach((key) => delete store[key]); }
        }
      });
    });
    const root = path.resolve(__dirname, '..');
    let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
    const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    html = html.replace('<link rel="stylesheet" href="styles.css" />', `<style>${css}</style>`);
    html = html.replace('<script src="app.js"></script>', `<script>${js}</script>`);
    await page.setContent(html, { waitUntil: 'load' });
    return;
  }
  await page.goto('/index.html');
}

async function setPrimaryScenario(page, exitValue) {
  await page.locator('#pCheckSize').fill('500000');
  await page.locator('#pRoundSize').fill('3500000');
  await page.locator('#pPreMoney').fill('12000000');
  await page.locator('#pFutureDilution').fill('35');
  await page.locator('#pFundSize').fill('25000000');
  await page.locator('#pExitValue').fill(String(exitValue));
}

test('Primary Deals shows fund-return waterfall and all verdict states', async ({ page }) => {
  await loadDashboard(page);
  await page.getByRole('button', { name: 'Primary Deals' }).click();

  await expect(page.getByRole('heading', { name: 'Fund Return Math' })).toBeVisible();
  await expect(page.getByText('Always calculate Investment → Ownership → Dilution → Exit → Fund Return.')).toBeVisible();
  await expect(page.getByText('Do not approve on company quality alone.')).toBeVisible();
  await expect(page.getByText('Great company ≠ great fund investment.')).toBeVisible();

  await setPrimaryScenario(page, 250000000);
  await expect(page.locator('#pWaterfallInvestment')).toContainText('$500,000');
  await expect(page.locator('#pWaterfallOwnership')).toContainText('3.23%');
  await expect(page.locator('#pWaterfallDilution')).toContainText('35.00% future dilution');
  await expect(page.locator('#pWaterfallExit')).toContainText('$250,000,000');
  await expect(page.locator('#pWaterfallFundReturn')).toContainText('0.17x of fund');
  await expect(page.locator('#pFundReturnVerdict')).toHaveText('Not enough fund impact yet');
  await expect(page.locator('#pMemoBody')).toContainText('Fund Return Case');
  await expect(page.locator('#pMemoBody')).toContainText('Investment $500,000 → ownership');

  await setPrimaryScenario(page, 500000000);
  await expect(page.locator('#pWaterfallExit')).toContainText('$500,000,000');
  await expect(page.locator('#pWaterfallFundReturn')).toContainText('0.34x of fund');
  await expect(page.locator('#pFundReturnVerdict')).toHaveText('Meaningful fund contributor');
  await expect(page.locator('#pMemoBody')).toContainText('Verdict: Meaningful fund contributor');

  await setPrimaryScenario(page, 1500000000);
  await expect(page.locator('#pWaterfallExit')).toContainText('$1,500,000,000');
  await expect(page.locator('#pWaterfallFundReturn')).toContainText('1.01x of fund');
  await expect(page.locator('#pFundReturnVerdict')).toHaveText('Fund-returning potential');
  await expect(page.locator('#pMemoBody')).toContainText('Verdict: Fund-returning potential');

  await page.screenshot({ path: 'screenshots/primary-fund-return-waterfall.png', fullPage: true });
});
