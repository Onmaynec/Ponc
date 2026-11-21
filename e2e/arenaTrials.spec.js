import { expect, test } from '@playwright/test';

test('FLUX arena and survival challenge activate together in a real browser', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#modeSelect').selectOption('solo');
  await page.locator('#rulesetSelect').selectOption('survival');
  await page.locator('#arenaSelect').selectOption('flux');
  await expect(page.locator('#winningScoreField')).toBeHidden();
  await expect(page.locator('#modeHint')).toContainText('три мяча');
  await expect(page.locator('#modeHint')).toContainText('FLUX');
  await page.locator('#startButton').click();
  await expect(page.locator('html')).toHaveAttribute('data-arena', 'flux');
  await expect(page.locator('html')).toHaveAttribute('data-ruleset', 'survival');
  await expect(page.locator('#matchRuleLabel')).toHaveText('ВЫЖИВАНИЕ');
  await expect(page.locator('#survivalMetric')).toBeVisible();
  await expect(page.locator('#survivalLives')).toHaveText('3');
  await expect(page.locator('#arenaMetric')).toContainText('FLUX');
  await expect(page.locator('#fatalError')).toBeHidden();
});

test('match setup persists after page reload', async ({ page }) => {
  await page.goto('/');
  await page.locator('#rulesetSelect').selectOption('survival');
  await page.locator('#difficultySelect').selectOption('hard');
  await page.locator('#arenaSelect').selectOption('flux');
  await page.locator('#powerUpsSelect').selectOption('on');
  await page.reload();
  await expect(page.locator('#rulesetSelect')).toHaveValue('survival');
  await expect(page.locator('#difficultySelect')).toHaveValue('hard');
  await expect(page.locator('#arenaSelect')).toHaveValue('flux');
  await expect(page.locator('#powerUpsSelect')).toHaveValue('on');
  await expect(page.locator('#modeHint')).toContainText('FLUX');
});

test('local survival leaderboards are rendered from validated saved records', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'ponc:survival-records:v1',
      JSON.stringify([
        {
          score: 4,
          difficulty: 'easy',
          arena: 'classic',
          powerUps: false,
          date: '2026-11-20T12:00:00Z',
        },
        {
          score: 8,
          difficulty: 'hard',
          arena: 'flux',
          powerUps: true,
          date: '2026-11-21T12:00:00Z',
        },
      ]),
    );
  });
  await page.goto('/');
  await expect(page.locator('#survivalBest')).toHaveText('8');
  await expect(page.locator('#survivalRuns')).toHaveText('2');
  await expect(page.locator('#survivalLeaderboard li').first()).toContainText('8 очк.');
  await expect(page.locator('#survivalLeaderboard li').first()).toContainText('FLUX');
});

test('responsive game stays navigable with expanded arena options', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await expect(page.locator('#arenaSelect')).toBeVisible();
  await page.locator('#arenaSelect').selectOption('flux');
  await page.locator('#startButton').click();
  await expect(page.locator('html')).toHaveAttribute('data-game-state', 'COUNTDOWN');
  await expect(page.locator('#fatalError')).toBeHidden();
});
