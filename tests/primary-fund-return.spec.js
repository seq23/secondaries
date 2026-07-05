const { test, expect } = require('@playwright/test');

test('Primary Deals shows fund-return waterfall, verdict, and memo row', async ({ page }) => {
  await page.goto('/index.html');
  await page.getByRole('button', { name: 'Primary Deals' }).click();

  await expect(page.getByRole('heading', { name: '9. What Return Could Our Fund Make?' })).toBeVisible();
  await expect(page.getByText('Always calculate Investment → Ownership → Dilution → Exit → Fund Return.')).toBeVisible();
  await expect(page.getByText('Do not approve on company quality alone.')).toBeVisible();
  await expect(page.getByText('Great company ≠ great fund investment.')).toBeVisible();

  await page.locator('#pCheckSize').fill('500000');
  await page.locator('#pRoundSize').fill('3500000');
  await page.locator('#pPreMoney').fill('12000000');
  await page.locator('#pExitValue').fill('250000000');
  await page.locator('#pFutureDilution').fill('35');
  await page.locator('#pFundSize').fill('25000000');

  await expect(page.locator('#pWaterfallInvestment')).toContainText('$500,000');
  await expect(page.locator('#pWaterfallOwnership')).toContainText('3.23%');
  await expect(page.locator('#pWaterfallDilution')).toContainText('35.00% future dilution');
  await expect(page.locator('#pWaterfallExit')).toContainText('$250,000,000');
  await expect(page.locator('#pWaterfallFundReturn')).toContainText('0.17x of fund');
  await expect(page.locator('#pFundReturnVerdict')).toHaveText('Not enough fund impact yet');
  await expect(page.locator('#pMemoBody')).toContainText('Fund Return Case');
  await expect(page.locator('#pMemoBody')).toContainText('Investment $500,000 → ownership');

  await page.screenshot({ path: 'screenshots/primary-fund-return-waterfall.png', fullPage: true });
});
