import assert from 'node:assert/strict';
import test from 'node:test';
import { GAME_CONFIG } from '../../src/config/gameConfig.js';
import { FixedStepAccumulator } from '../../src/core/FixedStepAccumulator.js';
import { GameCore } from '../../src/core/GameCore.js';
import { INPUT_MODES } from '../../src/core/constants.js';

function simulate(refreshRate) {
  const core = new GameCore({ random: () => 0.75 });
  core.startMatch();
  core.step(core.config.match.countdownSeconds);
  const accumulator = new FixedStepAccumulator(GAME_CONFIG.loop);
  const command = {
    mode: INPUT_MODES.KEYBOARD,
    direction: 0,
    targetY: GAME_CONFIG.field.height / 2,
  };

  for (let frame = 0; frame < refreshRate; frame += 1) {
    accumulator.advance(1 / refreshRate, (step) => core.step(step, command));
  }
  return core.getSnapshot();
}

test('produces equivalent motion at simulated 60, 120 and 144 Hz', () => {
  const snapshots = [60, 120, 144].map(simulate);
  const [reference, ...others] = snapshots;
  for (const snapshot of others) {
    assert.ok(Math.abs(snapshot.ball.x - reference.ball.x) < 0.001);
    assert.ok(Math.abs(snapshot.ball.y - reference.ball.y) < 0.001);
  }
});

test('clamps a delayed frame and limits catch-up updates', () => {
  const accumulator = new FixedStepAccumulator(GAME_CONFIG.loop);
  let updates = 0;
  const result = accumulator.advance(5, () => {
    updates += 1;
  });
  assert.ok(updates <= GAME_CONFIG.loop.maximumUpdatesPerFrame);
  assert.equal(result.updates, updates);
});
