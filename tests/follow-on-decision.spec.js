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

test('Follow-On Decision compares all four paths and produces an IC recommendation', async ({ page }) => {
  await loadDashboard(page);
  await page.getByRole('button', { name: 'Follow-On Decision' }).click();
  await expect(page.getByRole('heading', { name: 'Scenario comparison' })).toBeVisible();
  await expect(page.locator('#foScenarioBody')).toContainText('Skip');
  await expect(page.locator('#foScenarioBody')).toContainText('Exercise pro rata');
  await expect(page.locator('#foScenarioBody')).toContainText('Super pro rata');
  await expect(page.locator('#foScenarioBody')).toContainText('Buy secondary');
  await expect(page.locator('#foProRataCheck')).toContainText('$1,600,000');
  await expect(page.locator('#foSecondarySpread')).toContainText('Discount 15.00%');
  await expect(page.locator('#foRecommendation')).not.toBeEmpty();
  await expect(page.locator('#foMemoBody')).toContainText('Incremental economics');
});

test('portfolio constraints can disqualify capital-heavy follow-on paths', async ({ page }) => {
  await loadDashboard(page);
  await page.getByRole('button', { name: 'Follow-On Decision' }).click();
  await page.locator('#foRemainingReserves').fill('500000');
  await page.locator('#foMaxConcentration').fill('5');
  await expect(page.locator('#foRecommendation')).toContainText('Skip');
});


test('share-count math controls dilution and warns on inconsistent valuation inputs', async ({ page }) => {
  await loadDashboard(page);
  await page.getByRole('button', { name: 'Follow-On Decision' }).click();
  await expect(page.locator('#foStatus')).toContainText('Cap-table cross-check');
  await page.locator('#foPreMoney').fill('100000000');
  await expect(page.locator('#foStatus')).not.toContainText('Cap-table cross-check');
  await page.locator('#foMaxAllocation').fill('1000000');
  await expect(page.locator('#foScenarioBody')).toContainText('Allocation shortfall $600,000');
  await expect(page.locator('#foProRataCheck')).toContainText('$1,600,000');
});
