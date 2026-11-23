import { expect, test } from '@playwright/test';

test('power-up toggle changes the match and HUD', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#powerUpInfo')).toBeHidden();
  await page.locator('#powerUpsSelect').selectOption('on');
  await expect(page.locator('#modeHint')).toContainText('капсулы');
  await page.locator('#startButton').click();
  await expect(page.locator('html')).toHaveAttribute('data-game-state', 'COUNTDOWN');
  await expect(page.locator('#powerUpInfo')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-power-ups', 'true');
});

test('classic arena still starts with powerups disabled', async ({ page }) => {
  await page.goto('/');
  await page.locator('#startButton').click();
  await expect(page.locator('#powerUpInfo')).toBeHidden();
  await expect(page.locator('html')).toHaveAttribute('data-power-ups', 'false');
});
