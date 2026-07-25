import assert from 'node:assert/strict';
import test from 'node:test';
import { GameCore } from '../../src/core/GameCore.js';
import { GAME_EVENTS, GAME_STATES } from '../../src/core/constants.js';

function createCore() {
  return new GameCore({ random: () => 0.75 });
}

function enterPlaying(core) {
  core.startMatch();
  core.step(core.config.match.countdownSeconds);
  assert.equal(core.state, GAME_STATES.PLAYING);
}

test('awards points and ends exactly at winning score', () => {
  const core = createCore();
  enterPlaying(core);

  for (let score = 1; score <= core.config.match.winningScore; score += 1) {
    assert.equal(core.awardPoint('player'), true);
    assert.equal(core.score.player, score);
    if (score < core.config.match.winningScore) {
      core.step(core.config.match.countdownSeconds);
    }
  }

  assert.equal(core.state, GAME_STATES.GAME_OVER);
  assert.equal(core.winner, 'player');
  assert.equal(core.awardPoint('ai'), false);
  assert.equal(core.score.ai, 0);
});

test('emits weakly coupled goal, serve, pause and game-over events', () => {
  const core = createCore();
  const received = [];
  for (const eventName of [
    GAME_EVENTS.SERVE_STARTED,
    GAME_EVENTS.GOAL,
    GAME_EVENTS.PAUSED,
    GAME_EVENTS.GAME_OVER,
  ]) {
    core.events.on(eventName, () => received.push(eventName));
  }

  enterPlaying(core);
  core.pause();
  core.resume();
  core.score.player = core.config.match.winningScore - 1;
  core.awardPoint('player');

  assert.ok(received.includes(GAME_EVENTS.SERVE_STARTED));
  assert.ok(received.includes(GAME_EVENTS.PAUSED));
  assert.ok(received.includes(GAME_EVENTS.GOAL));
  assert.ok(received.includes(GAME_EVENTS.GAME_OVER));
});

test('core does not update physics outside PLAYING', () => {
  const core = createCore();
  const before = core.getSnapshot().ball.x;
  core.step(1);
  assert.equal(core.getSnapshot().ball.x, before);

  core.startMatch();
  core.pause();
  core.step(1);
  assert.equal(core.getSnapshot().ball.x, before);
});
