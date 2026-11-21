import assert from 'node:assert/strict';
import test from 'node:test';
import { GameCore } from '../../src/core/GameCore.js';
import { RULESETS } from '../../src/core/MatchSettings.js';
import { GAME_EVENTS, GAME_STATES } from '../../src/core/constants.js';
import {
  readSurvivalRecords,
  saveSurvivalRecord,
  summarizeSurvival,
} from '../../src/core/SurvivalRecords.js';
import { summarizeHistory } from '../../src/core/MatchHistory.js';
import { unlockedAchievements } from '../../src/core/Achievements.js';

function start() {
  const core = new GameCore({ random: () => 0.75 });
  core.configure({ ruleset: RULESETS.SURVIVAL, difficulty: 'hard' });
  core.startMatch();
  core.step(core.config.match.countdownSeconds);
  return core;
}

function inPlay(core) {
  if (core.state === GAME_STATES.COUNTDOWN)
    core.step(core.config.match.countdownSeconds);
}

test('survival counts scored goals and only ends after three conceded goals', () => {
  const core = start();
  core.awardPoint('player');
  inPlay(core);
  core.awardPoint('player');
  inPlay(core);
  for (let i = 0; i < 3; i++) {
    core.awardPoint('ai');
    assert.equal(core.survivalLives, 2 - i);
    if (i !== 2) inPlay(core);
  }
  assert.equal(core.score.player, 2);
  assert.equal(core.score.ai, 3);
  assert.equal(core.state, GAME_STATES.GAME_OVER);
  assert.equal(core.winner, 'ai');
  assert.equal(core.awardPoint('player'), false);
});

test('survival resets lives on return to menu or restart', () => {
  const core = start();
  core.awardPoint('ai');
  assert.equal(core.survivalLives, 2);
  core.restartMatch();
  assert.equal(core.survivalLives, 3);
  assert.equal(core.score.ai, 0);
});

test('survival events fire only once on the final life', () => {
  const core = start();
  const events = [];
  core.events.on(GAME_EVENTS.GAME_OVER, () => events.push('over'));
  for (let i = 0; i < 3; i++) {
    inPlay(core);
    core.awardPoint('ai');
  }
  assert.deepEqual(events, ['over']);
});

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  };
}

test('survival records persist, sort correctly and ignore other rulesets', () => {
  const storage = fakeStorage();
  const core = start();
  core.score.player = 6;
  core.score.ai = 2;
  core.awardPoint('ai');
  const record = core.getSnapshot();
  saveSurvivalRecord(storage, record, new Date('2026-11-21T12:00:00Z'));
  assert.equal(readSurvivalRecords(storage)[0].score, 6);
  assert.equal(summarizeSurvival(readSurvivalRecords(storage)).best, 6);
  assert.equal(summarizeSurvival(readSurvivalRecords(storage)).runs, 1);
  saveSurvivalRecord(storage, {
    ...record,
    settings: { ...record.settings, ruleset: 'classic' },
  });
  assert.equal(readSurvivalRecords(storage).length, 1);
  assert.deepEqual(readSurvivalRecords({ getItem: () => '{oops' }), []);
});

test('survival losses do not lower regular career win rate or unlock normal victories', () => {
  const data = [{ winner: 'ai', mode: 'solo', ruleset: 'survival', playerScore: 10 }];
  assert.deepEqual(summarizeHistory(data), { games: 0, wins: 0, losses: 0, winRate: 0 });
  assert.ok(unlockedAchievements(data).every((item) => !item.unlocked));
});
