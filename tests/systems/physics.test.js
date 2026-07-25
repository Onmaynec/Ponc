import assert from 'node:assert/strict';
import test from 'node:test';
import { GAME_CONFIG } from '../../src/config/gameConfig.js';
import { createBall } from '../../src/entities/createBall.js';
import { createPaddle } from '../../src/entities/createPaddle.js';
import { INPUT_MODES } from '../../src/core/constants.js';
import { PhysicsSystem } from '../../src/systems/PhysicsSystem.js';

function createModel() {
  return {
    ball: createBall(GAME_CONFIG),
    paddles: {
      player: createPaddle(GAME_CONFIG, 'player'),
      ai: createPaddle(GAME_CONFIG, 'ai'),
    },
  };
}

const neutralCommands = {
  player: { mode: INPUT_MODES.KEYBOARD, direction: 0, targetY: 200 },
  ai: { direction: 0 },
};

test('reflects the ball from top and bottom walls', () => {
  const physics = new PhysicsSystem(GAME_CONFIG);
  const model = createModel();

  model.ball.y = model.ball.radius;
  model.ball.vy = -200;
  physics.update(model, neutralCommands, 1 / 120);
  assert.ok(model.ball.vy > 0);

  model.ball.y = GAME_CONFIG.field.height - model.ball.radius;
  model.ball.vy = 200;
  physics.update(model, neutralCommands, 1 / 120);
  assert.ok(model.ball.vy < 0);
});

test('reflects from both paddles only while moving toward them', () => {
  const physics = new PhysicsSystem(GAME_CONFIG);
  const model = createModel();

  model.ball.x = model.paddles.player.x + model.paddles.player.width;
  model.ball.y = model.paddles.player.y + model.paddles.player.height / 2;
  model.ball.vx = -GAME_CONFIG.ball.initialSpeed;
  assert.equal(
    physics.resolvePaddleCollision(model.ball, model.paddles.player, 'player'),
    true,
  );
  assert.ok(model.ball.vx > 0);
  assert.equal(
    physics.resolvePaddleCollision(model.ball, model.paddles.player, 'player'),
    false,
  );

  model.ball.x = model.paddles.ai.x;
  model.ball.y = model.paddles.ai.y + model.paddles.ai.height / 2;
  model.ball.vx = GAME_CONFIG.ball.initialSpeed;
  assert.equal(
    physics.resolvePaddleCollision(model.ball, model.paddles.ai, 'ai'),
    true,
  );
  assert.ok(model.ball.vx < 0);
});

test('enforces maximum speed, horizontal minimum and bounce angle', () => {
  const physics = new PhysicsSystem(GAME_CONFIG);
  const model = createModel();
  const paddle = model.paddles.player;
  model.ball.x = paddle.x + paddle.width;
  model.ball.y = paddle.y;
  model.ball.vx = -1000;
  model.ball.vy = -1000;

  physics.resolvePaddleCollision(model.ball, paddle, 'player');
  const speed = Math.hypot(model.ball.vx, model.ball.vy);
  const angle = Math.abs(Math.atan2(model.ball.vy, model.ball.vx));
  assert.ok(speed <= GAME_CONFIG.ball.maximumSpeed + 1e-9);
  assert.ok(
    Math.abs(model.ball.vx) >= GAME_CONFIG.ball.minimumHorizontalSpeed - 1e-9,
  );
  assert.ok(angle <= GAME_CONFIG.ball.maximumBounceAngle + 1e-9);
});

test('clamps player and AI paddles to field bounds', () => {
  const physics = new PhysicsSystem(GAME_CONFIG);
  const model = createModel();
  physics.updatePlayer(
    model.paddles.player,
    { mode: INPUT_MODES.KEYBOARD, direction: -1, targetY: 0 },
    10,
  );
  physics.updateAI(model.paddles.ai, { direction: 1 }, 10);
  assert.equal(model.paddles.player.y, 0);
  assert.equal(
    model.paddles.ai.y,
    GAME_CONFIG.field.height - GAME_CONFIG.paddle.height,
  );
});
