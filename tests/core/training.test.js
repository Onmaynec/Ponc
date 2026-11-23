import assert from 'node:assert/strict';
import test from 'node:test';
import { GameCore } from '../../src/core/GameCore.js';
import { GAME_EVENTS, GAME_STATES } from '../../src/core/constants.js';
import { RULESETS, normalizeSettings } from '../../src/core/MatchSettings.js';
import {
  TRAINING_DRILLS,
  DRILL_PROFILES,
  TRAINING_SECONDS,
  TrainingSystem,
} from '../../src/core/TrainingSystem.js';
import {
  readTrainingRecords,
  saveTrainingRecord,
  summarizeTraining,
} from '../../src/core/TrainingRecords.js';
import { summarizeHistory } from '../../src/core/MatchHistory.js';
import { unlockedAchievements } from '../../src/core/Achievements.js';

function start(drill = 'precision') {
  const core = new GameCore({ random: () => 0.75 });
  core.configure({
    ruleset: RULESETS.TRAINING,
    drill,
    mode: 'local',
    difficulty: 'easy',
    arena: 'portal',
    powerUps: true,
  });
  core.startMatch();
  core.step(core.config.match.countdownSeconds);
  return core;
}
function nextServe(core) {
  if (core.state === GAME_STATES.COUNTDOWN) core.step(core.config.match.countdownSeconds);
}
function fakeStorage() {
  const entries = new Map();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
}

test('training normalizes drill and enforces fair solo classic arena without powerups', () => {
  const settings = normalizeSettings({
    ruleset: 'training',
    mode: 'local',
    arena: 'portal',
    powerUps: true,
    drill: 'bad',
  });
  assert.equal(settings.mode, 'solo');
  assert.equal(settings.arena, 'classic');
  assert.equal(settings.powerUps, false);
  assert.equal(settings.drill, 'precision');
  assert.equal(normalizeSettings({ drill: 'reflex' }).drill, 'reflex');
  assert.equal(Object.keys(DRILL_PROFILES).length, 3);
  assert.equal(start('reflex').settings.difficulty, 'hard');
});

test('precision alternates top/bottom targets and grants 3 for accurate vs 1 otherwise', () => {
  const core = start();
  core.model.ball.y = 30;
  core.awardPoint('player');
  assert.equal(core.training.points, 3);
  assert.equal(core.training.accurateShots, 1);
  assert.equal(core.training.target, 'bottom');
  nextServe(core);
  core.model.ball.y = 20;
  core.awardPoint('player');
  assert.equal(core.training.points, 4);
  assert.equal(core.training.accurateShots, 1);
  nextServe(core);
  core.model.ball.y = 30;
  core.awardPoint('player');
  assert.equal(core.training.points, 7);
  assert.equal(core.training.accuracy, 67);
  assert.equal(core.training.target, 'bottom');
});

test('rally awards consecutive player returns and a bonus every five saves', () => {
  const training = new TrainingSystem();
  training.reset(TRAINING_DRILLS.RALLY);
  for (let i = 0; i < 5; i++) training.onPaddleHit('player');
  assert.equal(training.points, 10);
  assert.equal(training.saves, 5);
  assert.equal(training.bestStreak, 5);
  training.onPaddleHit('ai');
  assert.equal(training.points, 10);
  training.onGoal('ai', 200, 400);
  assert.equal(training.streak, 0);
  training.onPaddleHit('player');
  assert.equal(training.points, 11);
});

test('reflex awards saves and ends on third conceded goal', () => {
  const core = start('reflex');
  const events = [];
  core.events.on(GAME_EVENTS.GAME_OVER, () => events.push('finish'));
  core.training.onPaddleHit('player');
  assert.equal(core.training.points, 2);
  for (let i = 0; i < 3; i++) {
    nextServe(core);
    core.awardPoint('ai');
  }
  assert.equal(core.training.lives, 0);
  assert.equal(core.state, GAME_STATES.GAME_OVER);
  assert.equal(core.winner, 'ai');
  assert.deepEqual(events, ['finish']);
});

test('training countdown ignores paused and serve time; finishes at 60 active seconds', () => {
  const core = start();
  core.model.ball.vx = 0;
  core.model.ball.vy = 0;
  core.step(12);
  assert.equal(core.training.remainingSeconds, TRAINING_SECONDS - 12);
  core.pause();
  core.step(100);
  assert.equal(core.training.remainingSeconds, 48);
  core.resume();
  core.step(48);
  assert.equal(core.state, GAME_STATES.GAME_OVER);
  assert.equal(core.training.remainingSeconds, 0);
});

test('training restart clears points, lives and timer', () => {
  const core = start('reflex');
  core.training.onPaddleHit('player');
  core.awardPoint('ai');
  core.restartMatch();
  assert.equal(core.training.points, 0);
  assert.equal(core.training.lives, 3);
  assert.equal(core.training.remainingSeconds, 60);
  assert.equal(core.state, GAME_STATES.COUNTDOWN);
});

test('snapshot does not leak training references and disabled drills leave normal rules unchanged', () => {
  const core = start();
  core.training.onPaddleHit('player');
  const snapshot = core.getSnapshot();
  snapshot.training.points = 900;
  assert.equal(core.training.points, 0);
  core.returnToMenu();
  core.configure({ ruleset: 'classic', winningScore: 5 });
  core.startMatch();
  assert.equal(core.getSnapshot().training.enabled, false);
  assert.equal(core.settings.winningScore, 5);
});

test('training records validate local data and track independent best results', () => {
  const storage = fakeStorage();
  const core = start();
  core.training.onGoal('player', 15, core.config.field.height);
  core.finishMatch('player');
  saveTrainingRecord(storage, core.getSnapshot(), new Date('2026-11-23T02:00:00Z'));
  const saved = readTrainingRecords(storage);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].points, 3);
  assert.equal(summarizeTraining(saved).best.precision, 3);
  assert.equal(summarizeTraining(saved).best.reflex, 0);
  saveTrainingRecord(storage, {
    ...core.getSnapshot(),
    settings: { ...core.settings, ruleset: 'classic' },
  });
  assert.equal(readTrainingRecords(storage).length, 1);
  assert.deepEqual(readTrainingRecords({ getItem: () => 'broken' }), []);
  assert.deepEqual(
    readTrainingRecords({
      getItem: () =>
        JSON.stringify([
          {
            drill: 'precision',
            points: -9,
            bestStreak: 1,
            accuracy: 99,
            date: '2026-11-23',
          },
        ]),
    }),
    [],
  );
});

test('training completion is not counted in normal win rate or achievements', () => {
  const data = [
    { mode: 'solo', ruleset: 'training', winner: 'player', playerScore: 10, aiScore: 0 },
  ];
  assert.deepEqual(summarizeHistory(data), { games: 0, wins: 0, losses: 0, winRate: 0 });
  assert.ok(unlockedAchievements(data).every((item) => !item.unlocked));
});
