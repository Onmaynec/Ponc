import { expect, test } from '@playwright/test';

test('championship forces solo, selects first stage and displays progress HUD', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.locator('#modeSelect').selectOption('local');
  await page.locator('#rulesetSelect').selectOption('circuit');
  await expect(page.locator('#modeSelect')).toHaveValue('solo');
  await expect(page.locator('#modeSelect')).toBeDisabled();
  await expect(page.locator('#arenaSelect')).toBeDisabled();
  await expect(page.locator('#powerUpsSelect')).toBeDisabled();
  await expect(page.locator('#difficultySelect')).toBeDisabled();
  await expect(page.locator('#winningScoreField')).toBeHidden();
  await expect(page.locator('#circuitRoute')).toBeVisible();
  await expect(page.locator('#modeHint')).toContainText('трёх этапов');
  await page.locator('#startButton').click();
  await expect(page.locator('html')).toHaveAttribute('data-ruleset', 'circuit');
  await expect(page.locator('html')).toHaveAttribute('data-arena', 'classic');
  await expect(page.locator('#matchRuleLabel')).toHaveText('ЧЕМПИОНАТ');
  await expect(page.locator('#circuitMetric')).toBeVisible();
  await expect(page.locator('#circuitStage')).toContainText('1/3');
  await expect(page.locator('#circuitStage')).toContainText('Квалификация');
  await expect(page.locator('#fatalError')).toBeHidden();
  expect(errors).toEqual([]);
});

test('portal arena can be played outside the circuit', async ({ page }) => {
  await page.goto('/');
  await page.locator('#arenaSelect').selectOption('portal');
  await expect(page.locator('#modeHint')).toContainText('портал');
  await page.locator('#startButton').click();
  await expect(page.locator('html')).toHaveAttribute('data-arena', 'portal');
  await expect(page.locator('#arenaMetric')).toContainText('PORTAL');
  await expect(page.locator('#fatalError')).toBeHidden();
});

test('trophy cabinet loads saved validated history', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'ponc:circuit-history:v1',
      JSON.stringify([
        { completed: 3, champion: true, date: '2026-11-21T11:00:00Z' },
        { completed: 1, champion: false, date: '2026-11-22T11:00:00Z' },
      ]),
    );
  });
  await page.goto('/');
  await expect(page.locator('#circuitTrophies')).toHaveText('1');
  await expect(page.locator('#circuitBest')).toHaveText('3/3');
  await expect(page.locator('#circuitAttempts')).toHaveText('2');
  await expect(page.locator('#circuitHistory li').first()).toContainText('ЧЕМПИОН');
});

test('circuit choice is restored after reload and mobile game starts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await page.locator('#rulesetSelect').selectOption('circuit');
  await page.reload();
  await expect(page.locator('#rulesetSelect')).toHaveValue('circuit');
  await expect(page.locator('#circuitRoute')).toBeVisible();
  await expect(page.locator('#modeSelect')).toBeDisabled();
  await page.locator('#startButton').click();
  await expect(page.locator('html')).toHaveAttribute('data-game-state', 'COUNTDOWN');
  await expect(page.locator('#fatalError')).toBeHidden();
});
