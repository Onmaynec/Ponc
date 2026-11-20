import assert from 'node:assert/strict';
import test from 'node:test';
import { GAME_CONFIG } from '../../src/config/gameConfig.js';
import { GameCore } from '../../src/core/GameCore.js';
import { GAME_EVENTS, GAME_STATES } from '../../src/core/constants.js';
import { PowerUpSystem, POWERUP_TYPES } from '../../src/systems/PowerUpSystem.js';

function model() {
  return {
    ball: { x: 400, y: 200, vx: 300, vy: 0, radius: 8 },
    paddles: {
      player: { x: 20, y: 160, width: 10, height: 80 },
      ai: { x: 770, y: 160, width: 10, height: 80 },
    },
  };
}

test('pickups spawn after active play time and require a previous paddle hit', () => {
  const system = new PowerUpSystem(GAME_CONFIG, () => 0);
  const state = model();
  system.step(5, state, null);
  assert.ok(system.pickup);
  assert.equal(system.pickup.type, POWERUP_TYPES.EXPAND);
  state.ball.x = system.pickup.x;
  state.ball.y = system.pickup.y;
  assert.equal(system.step(0.01, state, null), null);
  const collected = system.step(0.01, state, 'player');
  assert.deepEqual(collected, { type: POWERUP_TYPES.EXPAND, side: 'player' });
  assert.equal(state.paddles.player.height, 120);
  assert.equal(system.collected.player, 1);
});

test('expanded paddle returns to base size after seven playing seconds', () => {
  const system = new PowerUpSystem(GAME_CONFIG, () => 0);
  const state = model();
  system.step(5, state, null);
  state.ball.x = system.pickup.x;
  state.ball.y = system.pickup.y;
  system.step(0.01, state, 'ai');
  system.step(7, state, null);
  assert.equal(state.paddles.ai.height, GAME_CONFIG.paddle.height);
  assert.equal(state.paddles.player.height, GAME_CONFIG.paddle.height);
});

test('turbo accelerates a live ball while observing an upper speed cap', () => {
  const system = new PowerUpSystem(GAME_CONFIG, () => 0.5);
  const state = model();
  system.step(5, state, null);
  assert.equal(system.pickup.type, POWERUP_TYPES.TURBO);
  state.ball.x = system.pickup.x;
  state.ball.y = system.pickup.y;
  system.step(0.01, state, 'ai');
  assert.ok(state.ball.vx > 300);
  assert.ok(
    Math.hypot(state.ball.vx, state.ball.vy) <= GAME_CONFIG.ball.maximumSpeed * 1.25,
  );
});

test('shield blocks a single goal then is consumed', () => {
  const system = new PowerUpSystem(GAME_CONFIG, () => 0.999);
  const state = model();
  system.step(5, state, null);
  assert.equal(system.pickup.type, POWERUP_TYPES.SHIELD);
  state.ball.x = system.pickup.x;
  state.ball.y = system.pickup.y;
  system.step(0.01, state, 'player');
  state.ball.x = -20;
  state.ball.vx = -320;
  assert.deepEqual(system.blockGoal('ai', state), { side: 'player' });
  assert.ok(state.ball.vx > 0);
  assert.equal(system.blockGoal('ai', state), null);
});

test('round reset cancels effects but preserves match collection totals', () => {
  const system = new PowerUpSystem(GAME_CONFIG, () => 0);
  const state = model();
  system.step(5, state, null);
  state.ball.x = system.pickup.x;
  state.ball.y = system.pickup.y;
  system.step(0.01, state, 'player');
  system.resetRound(state);
  assert.equal(state.paddles.player.height, 80);
  assert.equal(system.collected.player, 1);
  system.resetMatch(state);
  assert.equal(system.collected.player, 0);
});

test('match core does not spawn powerups when disabled or paused', () => {
  const core = new GameCore({ random: () => 0 });
  core.startMatch();
  core.step(core.config.match.countdownSeconds);
  core.step(8);
  assert.equal(core.getSnapshot().powerUps.pickup, null);
  core.returnToMenu();
  core.configure({ powerUps: true });
  core.startMatch();
  core.step(core.config.match.countdownSeconds);
  core.pause();
  core.step(8);
  assert.equal(core.getSnapshot().powerUps.pickup, null);
  core.resume();
  core.model.ball.vx = 0;
  core.model.ball.vy = 0;
  core.step(3);
  assert.ok(core.getSnapshot().powerUps.pickup);
});

test('shield blocks a goal without emitting a point', () => {
  const core = new GameCore({ random: () => 0 });
  core.configure({ powerUps: true });
  core.startMatch();
  core.step(core.config.match.countdownSeconds);
  core.powerUps.effects.shield.player = 5;
  core.model.ball.x = -20;
  core.model.ball.vx = -300;
  core.model.ball.vy = 0;
  const events = [];
  core.events.on(GAME_EVENTS.POWER_UP_SHIELD, (value) => events.push(value));
  core.step(1 / 120);
  assert.equal(core.score.ai, 0);
  assert.equal(core.state, GAME_STATES.PLAYING);
  assert.equal(events.length, 1);
});
