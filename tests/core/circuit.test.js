import assert from 'node:assert/strict';
import test from 'node:test';
import { GameCore } from '../../src/core/GameCore.js';
import { GAME_EVENTS, GAME_STATES } from '../../src/core/constants.js';
import { normalizeSettings, RULESETS } from '../../src/core/MatchSettings.js';
import { CIRCUIT_STAGES, getCircuitStage } from '../../src/core/ChampionshipCircuit.js';
import {
  readCircuitRecords,
  saveCircuitResult,
  summarizeCircuit,
} from '../../src/core/CircuitRecords.js';
import { summarizeHistory } from '../../src/core/MatchHistory.js';
import { unlockedAchievements } from '../../src/core/Achievements.js';

function start() {
  const core = new GameCore({ random: () => 0.75 });
  core.configure({ ruleset: RULESETS.CIRCUIT, mode: 'local', difficulty: 'hard' });
  core.startMatch();
  core.step(core.config.match.countdownSeconds);
  return core;
}

function advance(core) {
  if (core.state === GAME_STATES.COUNTDOWN) core.step(core.config.match.countdownSeconds);
}

function winStage(core) {
  const target = core.settings.winningScore;
  for (let i = 0; i < target; i++) {
    advance(core);
    assert.equal(core.awardPoint('player'), true);
  }
}

test('circuit validates solo-only mode and defines three escalating rounds', () => {
  const settings = normalizeSettings({ ruleset: 'circuit', mode: 'local' });
  assert.equal(settings.mode, 'solo');
  assert.equal(CIRCUIT_STAGES.length, 3);
  assert.equal(getCircuitStage(3), null);
  assert.deepEqual(
    CIRCUIT_STAGES.map((s) => s.winningScore),
    [3, 5, 7],
  );
  assert.deepEqual(
    CIRCUIT_STAGES.map((s) => s.arena),
    ['classic', 'flux', 'portal'],
  );
});

test('tournament advances without emitting game over between rounds', () => {
  const core = start();
  const events = [];
  core.events.on(GAME_EVENTS.GAME_OVER, () => events.push('over'));
  core.events.on(GAME_EVENTS.CIRCUIT_ROUND, (payload) => events.push(payload.round));
  assert.equal(core.settings.difficulty, 'easy');
  assert.equal(core.settings.winningScore, 3);
  winStage(core);
  assert.equal(core.state, GAME_STATES.COUNTDOWN);
  assert.equal(core.circuit.completed, 1);
  assert.equal(core.circuit.round, 1);
  assert.equal(core.settings.arena, 'flux');
  assert.equal(core.settings.difficulty, 'normal');
  assert.deepEqual(core.score, { player: 0, ai: 0 });
  assert.deepEqual(events, [2]);
  advance(core);
  winStage(core);
  assert.equal(core.settings.arena, 'portal');
  assert.equal(core.settings.difficulty, 'hard');
  assert.equal(core.circuit.completed, 2);
  advance(core);
  winStage(core);
  assert.equal(core.state, GAME_STATES.GAME_OVER);
  assert.equal(core.winner, 'player');
  assert.equal(core.circuit.champion, true);
  assert.equal(core.circuit.completed, 3);
  assert.deepEqual(events, [2, 3, 'over']);
});

test('any lost round ends the circuit, with stage and result recorded', () => {
  const core = start();
  for (let i = 0; i < 3; i++) {
    advance(core);
    core.awardPoint('ai');
  }
  assert.equal(core.state, GAME_STATES.GAME_OVER);
  assert.equal(core.winner, 'ai');
  assert.equal(core.circuit.completed, 0);
  assert.equal(core.circuit.champion, false);
  assert.equal(core.circuit.results[0].winner, 'ai');
  assert.equal(core.circuit.results[0].stage, 'qualifier');
  assert.equal(core.awardPoint('player'), false);
});

test('restart clears trophy and returns to qualifier after winning', () => {
  const core = start();
  winStage(core);
  advance(core);
  winStage(core);
  advance(core);
  winStage(core);
  core.restartMatch();
  assert.equal(core.settings.difficulty, 'easy');
  assert.equal(core.settings.arena, 'classic');
  assert.equal(core.circuit.completed, 0);
  assert.equal(core.circuit.champion, false);
  assert.equal(core.circuit.results.length, 0);
  assert.equal(core.state, GAME_STATES.COUNTDOWN);
});

test('snapshots cannot mutate internal championship results', () => {
  const core = start();
  winStage(core);
  const snapshot = core.getSnapshot();
  snapshot.circuit.results[0].score.player = 900;
  assert.equal(core.circuit.results[0].score.player, 3);
});

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('trophies persist separately and corrupted records are rejected', () => {
  const core = start();
  winStage(core);
  advance(core);
  winStage(core);
  advance(core);
  winStage(core);
  const db = storage();
  saveCircuitResult(db, core.getSnapshot(), new Date('2026-11-23T00:00:00.000Z'));
  const records = readCircuitRecords(db);
  assert.equal(records.length, 1);
  assert.deepEqual(summarizeCircuit(records), {
    attempts: 1,
    trophies: 1,
    best: 3,
    recent: records,
  });
  assert.deepEqual(readCircuitRecords({ getItem: () => 'not json' }), []);
  assert.deepEqual(
    readCircuitRecords({
      getItem: () => JSON.stringify([{ completed: 99, champion: true, date: 'today' }]),
    }),
    [],
  );
  saveCircuitResult(db, {
    ...core.getSnapshot(),
    settings: { mode: 'solo', ruleset: 'classic' },
  });
  assert.equal(readCircuitRecords(db).length, 1);
});

test('circuit matches do not distort normal career or legacy achievements', () => {
  const data = [
    {
      mode: 'solo',
      winner: 'player',
      ruleset: 'circuit',
      playerScore: 7,
      aiScore: 0,
      difficulty: 'hard',
    },
  ];
  assert.deepEqual(summarizeHistory(data), { games: 0, wins: 0, losses: 0, winRate: 0 });
  assert.ok(unlockedAchievements(data).every((item) => !item.unlocked));
});
