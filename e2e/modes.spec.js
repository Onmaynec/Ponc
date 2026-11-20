import { expect, test } from '@playwright/test';

test('selects local match settings and shows the second human player', async ({ page }) => {
  await page.goto('/');
  await page.locator('#modeSelect').selectOption('local');
  await expect(page.locator('#difficultyField')).toBeHidden();
  await page.locator('#winningScoreSelect').selectOption('5');
  await page.getByRole('button', { name: 'НАЧАТЬ МАТЧ' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-game-state', 'COUNTDOWN');
  await expect(page.locator('#aiLabel')).toHaveText('Игрок 2');
  await expect(page.locator('#fatalError')).toBeHidden();
});
