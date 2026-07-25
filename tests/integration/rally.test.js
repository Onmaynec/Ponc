import assert from 'node:assert/strict';
import test from 'node:test';
import { GameCore } from '../../src/core/GameCore.js';
import { GAME_STATES, INPUT_MODES } from '../../src/core/constants.js';

test('runs a serve through to a scored point', () => {
  const core = new GameCore({ random: () => 0.75 });
  core.startMatch();
  core.step(core.config.match.countdownSeconds);
  assert.equal(core.state, GAME_STATES.PLAYING);

  core.model.ball.x = core.config.field.width + core.model.ball.radius + 1;
  core.model.ball.vx = core.config.ball.initialSpeed;
  core.step(1 / 120, {
    mode: INPUT_MODES.KEYBOARD,
    direction: 0,
    targetY: core.config.field.height / 2,
  });

  assert.equal(core.score.player, 1);
  assert.equal(core.state, GAME_STATES.COUNTDOWN);
});
