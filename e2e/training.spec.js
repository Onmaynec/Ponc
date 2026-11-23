import { expect, test } from '@playwright/test';

test('academy enables precision drill, locks fair-play settings and shows live training HUD', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.locator('#modeSelect').selectOption('local');
  await page.locator('#rulesetSelect').selectOption('training');
  await expect(page.locator('#modeSelect')).toHaveValue('solo');
  await expect(page.locator('#modeSelect')).toBeDisabled();
  await expect(page.locator('#arenaSelect')).toBeDisabled();
  await expect(page.locator('#powerUpsSelect')).toBeDisabled();
  await expect(page.locator('#difficultySelect')).toBeDisabled();
  await expect(page.locator('#winningScoreField')).toBeHidden();
  await expect(page.locator('#trainingDrillField')).toBeVisible();
  await expect(page.locator('#modeHint')).toContainText('60 секунд');
  await expect(page.locator('#modeHint')).toContainText('подсвеченную зону');
  await page.locator('#startButton').click();
  await expect(page.locator('html')).toHaveAttribute('data-ruleset', 'training');
  await expect(page.locator('html')).toHaveAttribute('data-arena', 'classic');
  await expect(page.locator('#matchRuleLabel')).toHaveText('ТРЕНИРОВКА');
  await expect(page.locator('#trainingMetric')).toBeVisible();
  await expect(page.locator('#trainingPoints')).toHaveText('0');
  await expect(page.locator('#trainingClock')).toContainText('60');
  await expect(page.locator('#trainingDetails')).toContainText('ВЕРХ');
  await expect(page.locator('#fatalError')).toBeHidden();
  expect(errors).toEqual([]);
});

test('drills change description and persist after reload', async ({ page }) => {
  await page.goto('/');
  await page.locator('#rulesetSelect').selectOption('training');
  await page.locator('#trainingDrillSelect').selectOption('rally');
  await expect(page.locator('#modeHint')).toContainText('5 отбиваний подряд');
  await page.reload();
  await expect(page.locator('#rulesetSelect')).toHaveValue('training');
  await expect(page.locator('#trainingDrillSelect')).toHaveValue('rally');
  await page.locator('#startButton').click();
  await expect(page.locator('#trainingDetails')).toContainText('Серия');
  await expect(page.locator('html')).toHaveAttribute('data-ruleset', 'training');
});

test('reflex drill has expert difficulty and visible three-life progress', async ({ page }) => {
  await page.goto('/');
  await page.locator('#rulesetSelect').selectOption('training');
  await page.locator('#trainingDrillSelect').selectOption('reflex');
  await expect(page.locator('#modeHint')).toContainText('Три пропущенных');
  await page.locator('#startButton').click();
  await expect(page.locator('#trainingDetails')).toContainText('Жизни: 3');
  await expect(page.locator('#fatalError')).toBeHidden();
});

test('personal academy records render separate best results per drill', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'ponc:training-records:v1',
      JSON.stringify([
        { drill: 'rally', points: 25, bestStreak: 10, accuracy: 0, date: '2026-11-23T00:00:00Z' },
        { drill: 'precision', points: 12, bestStreak: 1, accuracy: 80, date: '2026-11-23T01:00:00Z' },
        { drill: 'reflex', points: 18, bestStreak: 4, accuracy: 0, date: '2026-11-23T02:00:00Z' },
      ]),
    );
  });
  await page.goto('/');
  await expect(page.locator('#trainingPrecisionBest')).toHaveText('12');
  await expect(page.locator('#trainingRallyBest')).toHaveText('25');
  await expect(page.locator('#trainingReflexBest')).toHaveText('18');
  await expect(page.locator('#trainingAttempts')).toHaveText('3');
  await expect(page.locator('#trainingHistory li').first()).toContainText('Контроль');
});

test('training is usable in a 320px mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await page.locator('#rulesetSelect').selectOption('training');
  await expect(page.locator('#trainingDrillSelect')).toBeVisible();
  await page.locator('#trainingDrillSelect').selectOption('reflex');
  await page.locator('#startButton').click();
  await expect(page.locator('html')).toHaveAttribute('data-game-state', 'COUNTDOWN');
  await expect(page.locator('#trainingMetric')).toBeVisible();
  await expect(page.locator('#fatalError')).toBeHidden();
});
