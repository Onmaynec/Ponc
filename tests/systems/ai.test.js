import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_AI_DIFFICULTY,
  getAIDifficultyProfile,
  normalizeAIDifficulty,
} from '../../src/config/aiDifficulty.js';
import { GAME_CONFIG } from '../../src/config/gameConfig.js';
import { AISystem } from '../../src/systems/AISystem.js';

function createSnapshot(ballY = 350) {
  return {
    field: { ...GAME_CONFIG.field },
    ball: { y: ballY },
    paddles: {
      ai: {
        y: GAME_CONFIG.field.height / 2 - GAME_CONFIG.paddle.height / 2,
        height: GAME_CONFIG.paddle.height,
      },
    },
  };
}

test('normalizes unknown difficulty to the medium profile', () => {
  assert.equal(normalizeAIDifficulty('nightmare'), DEFAULT_AI_DIFFICULTY);
  assert.equal(getAIDifficultyProfile('nightmare').id, DEFAULT_AI_DIFFICULTY);
});

test('difficulty profiles produce distinct paddle speeds', () => {
  const easy = new AISystem(GAME_CONFIG, { difficulty: 'easy', random: () => 0.5 });
  const medium = new AISystem(GAME_CONFIG, {
    difficulty: 'medium',
    random: () => 0.5,
  });
  const hard = new AISystem(GAME_CONFIG, { difficulty: 'hard', random: () => 0.5 });
  const snapshot = createSnapshot();

  const easyCommand = easy.createCommand(snapshot);
  const mediumCommand = medium.createCommand(snapshot);
  const hardCommand = hard.createCommand(snapshot);

  assert.equal(easyCommand.direction, 1);
  assert.equal(mediumCommand.direction, 1);
  assert.equal(hardCommand.direction, 1);
  assert.ok(easyCommand.speed < mediumCommand.speed);
  assert.ok(mediumCommand.speed < hardCommand.speed);
});

test('AI keeps its target until the reaction interval expires', () => {
  const ai = new AISystem(GAME_CONFIG, { difficulty: 'easy', random: () => 0.5 });
  const snapshot = createSnapshot(350);

  assert.equal(ai.createCommand(snapshot, 0).direction, 1);
  snapshot.ball.y = 40;
  assert.equal(ai.createCommand(snapshot, 0.01).direction, 1);
  assert.equal(ai.createCommand(snapshot, 0.2).direction, -1);
});

test('changing difficulty resets reaction state and applies the new profile', () => {
  const ai = new AISystem(GAME_CONFIG, { difficulty: 'easy', random: () => 0.5 });
  ai.createCommand(createSnapshot(), 0);

  assert.equal(ai.setDifficulty('hard'), 'hard');
  assert.equal(ai.reactionRemainingSeconds, 0);
  assert.equal(ai.createCommand(createSnapshot(), 0).speed, 330);
});
