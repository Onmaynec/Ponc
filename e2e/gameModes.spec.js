import { expect, test } from '@playwright/test';

test('ruleset selection updates menu and live match HUD', async ({ page }) => {
  await page.goto('/');
  await page.locator('#rulesetSelect').selectOption('timed');
  await expect(page.locator('#winningScoreField')).toBeHidden();
  await expect(page.locator('#modeHint')).toContainText('90 секунд');
  await page.locator('#startButton').click();
  await expect(page.locator('#matchRuleLabel')).toHaveText('НА ВРЕМЯ');
  await expect(page.locator('#matchClock')).toBeVisible();
  await expect(page.locator('#matchClock')).toContainText('90');
});

test('sudden death hides target score and sets the ruleset', async ({ page }) => {
  await page.goto('/');
  await page.locator('#rulesetSelect').selectOption('sudden');
  await expect(page.locator('#winningScoreField')).toBeHidden();
  await page.locator('#startButton').click();
  await expect(page.locator('#matchRuleLabel')).toHaveText('РЕШАЮЩЕЕ ОЧКО');
  await expect(page.locator('#matchClock')).toBeHidden();
});
