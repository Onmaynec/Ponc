import { expect, test } from '@playwright/test';

test('selects, applies and persists AI difficulty', async ({ page }) => {
  await page.goto('/');

  const difficulty = page.locator('#difficultySelect');
  await difficulty.selectOption('hard');
  await expect(page.locator('html')).toHaveAttribute('data-ai-difficulty', 'hard');
  await expect(page.locator('#difficultyBadge')).toHaveText('AI: Сложно');

  await page.getByRole('button', { name: 'Начать матч' }).click();
  await expect(difficulty).toBeDisabled();

  await page.reload();
  await expect(difficulty).toHaveValue('hard');
  await expect(page.locator('html')).toHaveAttribute('data-ai-difficulty', 'hard');
});
