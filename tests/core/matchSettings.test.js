import assert from 'node:assert/strict';
import test from 'node:test';
import { GameCore } from '../../src/core/GameCore.js';
import { GAME_STATES } from '../../src/core/constants.js';
import { normalizeSettings } from '../../src/core/MatchSettings.js';
import {
  readMatchHistory,
  saveMatchResult,
  summarizeHistory,
} from '../../src/core/MatchHistory.js';
import { AISystem } from '../../src/systems/AISystem.js';

function fakeStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('normalizes match choices and rejects arbitrary score limits', () => {
  assert.deepEqual(
    normalizeSettings({ mode: 'local', difficulty: 'hard', winningScore: '7' }),
    {
      mode: 'local',
      difficulty: 'hard',
      winningScore: 7,
      ruleset: 'classic',
      powerUps: false,
    },
  );
  assert.equal(normalizeSettings({ winningScore: -20 }).winningScore, 11);
});

test('local match uses human second paddle command and selected win limit', () => {
  const core = new GameCore({ random: () => 0.75 });
  assert.equal(core.configure({ mode: 'local', winningScore: 5 }), true);
  core.startMatch();
  core.step(core.config.match.countdownSeconds);
  assert.equal(core.state, GAME_STATES.PLAYING);
  assert.equal(core.configure({ winningScore: 15 }), false);
  const oldY = core.model.paddles.ai.y;
  core.model.ball.vx = 300;
  core.step(1 / 120, core.createNeutralInput(), { direction: -1 });
  assert.ok(core.model.paddles.ai.y < oldY);
  for (let i = 0; i < 5; i += 1) {
    core.awardPoint('player');
    if (i < 4) core.step(core.config.match.countdownSeconds);
  }
  assert.equal(core.winner, 'player');
  assert.equal(core.getSnapshot().winningScore, 5);
});

test('history records finished games and separates solo career stats', () => {
  const storage = fakeStorage();
  const snapshot = {
    winner: 'player',
    score: { player: 5, ai: 3 },
    settings: { mode: 'solo', difficulty: 'hard' },
  };
  saveMatchResult(storage, snapshot, new Date('2026-01-01T00:00:00Z'));
  saveMatchResult(storage, {
    ...snapshot,
    settings: { mode: 'local', difficulty: 'hard' },
  });
  assert.equal(readMatchHistory(storage).length, 2);
  assert.deepEqual(summarizeHistory(readMatchHistory(storage)), {
    games: 1,
    wins: 1,
    losses: 0,
    winRate: 100,
  });
  assert.deepEqual(readMatchHistory({ getItem: () => '{invalid' }), []);
});

test('hard AI is more responsive than easy AI', () => {
  const core = new GameCore();
  const ai = new AISystem(core.config);
  const snapshot = core.getSnapshot();
  snapshot.ball.y = snapshot.paddles.ai.y + snapshot.paddles.ai.height / 2 + 17;
  snapshot.ball.vx = -300;
  snapshot.ball.vy = 0;
  snapshot.settings.difficulty = 'easy';
  const easy = ai.createCommand(snapshot);
  snapshot.settings.difficulty = 'hard';
  const hard = ai.createCommand(snapshot);
  assert.equal(easy.direction, 0);
  assert.equal(hard.direction, 1);
  assert.ok(hard.speedFactor > easy.speedFactor);
});
