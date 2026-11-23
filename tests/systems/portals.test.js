import assert from 'node:assert/strict';
import test from 'node:test';
import { GAME_CONFIG } from '../../src/config/gameConfig.js';
import { ArenaSystem } from '../../src/systems/ArenaSystem.js';
import { GameCore } from '../../src/core/GameCore.js';
import { GAME_EVENTS, GAME_STATES } from '../../src/core/constants.js';

test('entering a portal teleports the ball to the opposite gate', () => {
  const arena = new ArenaSystem(GAME_CONFIG);
  const first = arena.portals[0];
  const second = arena.portals[1];
  const ball = { x: first.x, y: first.y, vx: 300, vy: 65, radius: 8 };
  const result = arena.stepPortal(1 / 120, ball);
  assert.equal(result, true);
  assert.equal(arena.totalTeleports, 1);
  assert.equal(ball.x, second.x);
  assert.equal(ball.y, second.y);
  assert.equal(ball.vx, 300);
  assert.equal(ball.vy, 65);
  assert.ok(arena.portalCooldown > 0);
});

test('portal cooldown prevents immediate re-entry and expires during active play', () => {
  const arena = new ArenaSystem(GAME_CONFIG);
  const p = arena.portals[0];
  const ball = { x: p.x, y: p.y, vx: 300, vy: 0, radius: 8 };
  assert.equal(arena.stepPortal(0.01, ball), true);
  assert.equal(arena.stepPortal(0.01, ball), false);
  assert.equal(arena.totalTeleports, 1);
  ball.x = 30;
  arena.stepPortal(0.8, ball);
  assert.equal(arena.portalCooldown, 0);
  ball.x = p.x;
  ball.y = p.y;
  assert.equal(arena.stepPortal(0.01, ball), true);
  assert.equal(arena.totalTeleports, 2);
});

test('no portal movement or teleport during pause or countdown', () => {
  const core = new GameCore({ random: () => 0.75 });
  core.configure({ arena: 'portal' });
  core.startMatch();
  const first = core.arena.portals[0];
  core.model.ball.x = first.x;
  core.model.ball.y = first.y;
  core.step(0.3);
  assert.equal(core.arena.totalTeleports, 0);
  core.step(core.config.match.countdownSeconds);
  core.pause();
  core.step(2);
  assert.equal(core.arena.totalTeleports, 0);
  core.resume();
  core.model.ball.x = first.x;
  core.model.ball.y = first.y;
  core.model.ball.vx = 100;
  core.model.ball.vy = 0;
  const events = [];
  core.events.on(GAME_EVENTS.ARENA_PORTAL, () => events.push(1));
  core.step(1 / 120);
  assert.equal(core.arena.totalTeleports, 1);
  assert.equal(events.length, 1);
});

test('arena snapshot exposes only the active arena elements', () => {
  const arena = new ArenaSystem(GAME_CONFIG);
  assert.equal(arena.snapshot('classic').enabled, false);
  assert.equal(arena.snapshot('classic').portals, null);
  assert.equal(arena.snapshot('flux').hazard !== null, true);
  assert.equal(arena.snapshot('portal').hazard, null);
  assert.equal(arena.snapshot('portal').portals.length, 2);
  const snapshot = arena.snapshot('portal');
  snapshot.portals[0].x = -1000;
  assert.ok(arena.portals[0].x > 0);
});
