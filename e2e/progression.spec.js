import { expect, test } from '@playwright/test';

test('audio and palette settings survive a reload', async ({ page }) => {
  await page.goto('/');
  await page.locator('#soundToggle').uncheck();
  await page.locator('#paletteSelect').selectOption('retro');
  await page.reload();
  await expect(page.locator('#soundToggle')).not.toBeChecked();
  await expect(page.locator('#paletteSelect')).toHaveValue('retro');
  await expect(page.locator('#achievementCount')).toHaveText('0/5');
});
