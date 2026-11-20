import assert from 'node:assert/strict';
import test from 'node:test';
import { GameCore } from '../../src/core/GameCore.js';
import { GAME_STATES, GAME_EVENTS } from '../../src/core/constants.js';
import {
  normalizeSettings,
  RULESETS,
  TIME_ATTACK_SECONDS,
} from '../../src/core/MatchSettings.js';

function start(ruleset) {
  const core = new GameCore({ random: () => 0.75 });
  core.configure({ ruleset });
  core.startMatch();
  core.step(core.config.match.countdownSeconds);
  return core;
}

test('invalid rulesets fall back to classic', () => {
  assert.equal(normalizeSettings({ ruleset: 'invalid' }).ruleset, RULESETS.CLASSIC);
});

test('sudden death ends on the first point and rejects later scoring', () => {
  const core = start(RULESETS.SUDDEN_DEATH);
  assert.equal(core.awardPoint('ai'), true);
  assert.equal(core.state, GAME_STATES.GAME_OVER);
  assert.equal(core.winner, 'ai');
  assert.equal(core.awardPoint('player'), false);
});

test('time attack freezes the clock on countdown and pause', () => {
  const core = new GameCore();
  core.configure({ ruleset: RULESETS.TIME_ATTACK });
  core.startMatch();
  core.step(1);
  assert.equal(core.remainingSeconds, TIME_ATTACK_SECONDS);
  core.step(1);
  core.pause();
  core.step(10);
  assert.equal(core.remainingSeconds, TIME_ATTACK_SECONDS);
  core.resume();
  core.step(0.1);
  assert.ok(core.remainingSeconds < TIME_ATTACK_SECONDS);
});

test('time attack ends when clock expires with a leader', () => {
  const core = start(RULESETS.TIME_ATTACK);
  let ends = 0;
  core.events.on(GAME_EVENTS.GAME_OVER, () => ends++);
  core.score.player = 2;
  core.step(TIME_ATTACK_SECONDS);
  assert.equal(core.state, GAME_STATES.GAME_OVER);
  assert.equal(core.winner, 'player');
  assert.equal(ends, 1);
});

test('time attack tie enters golden-point overtime', () => {
  const core = start(RULESETS.TIME_ATTACK);
  core.step(TIME_ATTACK_SECONDS);
  assert.equal(core.overtime, true);
  assert.equal(core.state, GAME_STATES.PLAYING);
  core.awardPoint('player');
  assert.equal(core.state, GAME_STATES.GAME_OVER);
  assert.equal(core.winner, 'player');
});

test('restart resets the timer and overtime', () => {
  const core = start(RULESETS.TIME_ATTACK);
  core.step(TIME_ATTACK_SECONDS);
  core.restartMatch();
  assert.equal(core.remainingSeconds, TIME_ATTACK_SECONDS);
  assert.equal(core.overtime, false);
  assert.equal(core.state, GAME_STATES.COUNTDOWN);
});
