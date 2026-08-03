import assert from 'node:assert/strict';
import test from 'node:test';
import { GAME_CONFIG } from '../../src/config/gameConfig.js';
import { createPaddle } from '../../src/entities/createPaddle.js';
import { PhysicsSystem } from '../../src/systems/PhysicsSystem.js';

test('applies the speed supplied by an AI difficulty command', () => {
  const physics = new PhysicsSystem(GAME_CONFIG);
  const paddle = createPaddle(GAME_CONFIG, 'ai');
  const before = paddle.y;

  physics.updateAI(paddle, { direction: -1, speed: 210 }, 0.1);
  assert.equal(paddle.y, before - 21);
});
