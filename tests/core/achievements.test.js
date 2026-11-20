import test from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, unlockedAchievements } from '../../src/core/Achievements.js';

const game = (winner, aiScore, difficulty = 'normal', mode = 'solo') =>
  ({ winner, aiScore, difficulty, mode });

test('achievements unlock only for valid solo wins', () => {
  const results = unlockedAchievements([game('player', 0, 'hard'), game('player', 3, 'normal', 'local')]);
  assert.equal(results.filter((item) => item.unlocked).length, 3);
  assert.deepEqual(results.filter((item) => item.unlocked).map((item) => item.id),
    ['first_win', 'hard_win', 'clean_sheet']);
});

test('win milestones require enough solo wins', () => {
  const results = unlockedAchievements(Array.from({ length: 10 }, () => game('player', 4)));
  assert.equal(results.length, ACHIEVEMENTS.length);
  assert.ok(results.find((item) => item.id === 'five_wins').unlocked);
  assert.ok(results.find((item) => item.id === 'ten_wins').unlocked);
  assert.equal(results.find((item) => item.id === 'hard_win').unlocked, false);
});
