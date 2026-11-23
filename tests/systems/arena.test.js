import assert from 'node:assert/strict';
import test from 'node:test';
import { GAME_CONFIG } from '../../src/config/gameConfig.js';
import { ArenaSystem } from '../../src/systems/ArenaSystem.js';
import { GameCore } from '../../src/core/GameCore.js';
import { GAME_EVENTS, GAME_STATES } from '../../src/core/constants.js';

test('flux bumper moves in bounds and reverses at the edge', () => {
  const arena = new ArenaSystem(GAME_CONFIG);
  const ball = { x: 60, y: 80, vx: 300, vy: 0, radius: 8 };
  for (let i = 0; i < 3000; i++) {
    arena.step(1 / 120, ball);
    assert.ok(arena.hazard.y >= 18);
    assert.ok(arena.hazard.y <= GAME_CONFIG.field.height - arena.hazard.height - 18);
  }
});

test('bumper reflects a ball approaching the left face without repeated collisions', () => {
  const arena = new ArenaSystem(GAME_CONFIG);
  const h = arena.hazard;
  const ball = {
    x: h.x - 4,
    y: h.y + h.height / 2,
    vx: 300,
    vy: 0,
    radius: 8,
  };
  assert.equal(arena.step(1 / 120, ball), true);
  assert.ok(ball.vx < 0);
  assert.ok(ball.x + ball.radius < h.x);
  assert.equal(arena.step(1 / 120, ball), false);
  assert.equal(arena.totalBounces, 1);
});

test('bumper reflects from the right and does not move while paused', () => {
  const core = new GameCore({ random: () => 0.75 });
  core.configure({ arena: 'flux' });
  core.startMatch();
  core.step(core.config.match.countdownSeconds);
  core.model.ball.vx = 0;
  core.model.ball.vy = 0;
  const before = core.getSnapshot().arena.hazard.y;
  core.step(0.1);
  assert.ok(core.getSnapshot().arena.hazard.y > before);
  core.pause();
  const paused = core.getSnapshot().arena.hazard.y;
  core.step(10);
  assert.equal(core.getSnapshot().arena.hazard.y, paused);
  assert.equal(core.state, GAME_STATES.PAUSED);
});

test('core emits an arena bounce but does not count it as a paddle rally', () => {
  const core = new GameCore({ random: () => 0.75 });
  core.configure({ arena: 'flux' });
  core.startMatch();
  core.step(core.config.match.countdownSeconds);
  const h = core.arena.hazard;
  core.model.ball.x = h.x - 6;
  core.model.ball.y = h.y + h.height / 2;
  core.model.ball.vx = 300;
  core.model.ball.vy = 0;
  const observed = [];
  core.events.on(GAME_EVENTS.ARENA_BOUNCE, () => observed.push('bounce'));
  core.step(1 / 120);
  assert.equal(observed.length, 1);
  assert.equal(core.rallyHits, 0);
  assert.equal(core.getSnapshot().arena.totalBounces, 1);
  core.restartMatch();
  assert.equal(core.getSnapshot().arena.totalBounces, 0);
});

test('classic arena never activates a bumper', () => {
  const core = new GameCore();
  core.startMatch();
  core.step(core.config.match.countdownSeconds);
  assert.equal(core.getSnapshot().arena.enabled, false);
  assert.equal(core.getSnapshot().arena.hazard, null);
});
