import { expect, test } from '@playwright/test';

test('loads, starts, pauses, resumes and resets a match', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/');
  await expect(page).toHaveTitle(/Ponc 1\.1\.0/);
  await expect(page.locator('html')).toHaveAttribute('data-app-version', '1.1.0');
  await expect(page.getByRole('button', { name: 'Начать матч' })).toBeVisible();

  await page.getByRole('button', { name: 'Начать матч' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-game-state', 'COUNTDOWN');

  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-game-state', 'PAUSED');

  await page.locator('#resumeButton').click();
  await expect(page.locator('html')).toHaveAttribute('data-game-state', 'COUNTDOWN');

  await page.locator('#restartButton').click();
  await expect(page.locator('html')).toHaveAttribute('data-game-state', 'COUNTDOWN');
  await expect(page.locator('#playerScore')).toHaveText('0');
  await expect(page.locator('#aiScore')).toHaveText('0');
  expect(consoleErrors).toEqual([]);
});

test('renders at a 320 px mobile viewport without fatal initialization errors', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  await expect(page.locator('#fatalError')).toBeHidden();
  await expect(page.locator('#gameCanvas')).toBeVisible();
});
