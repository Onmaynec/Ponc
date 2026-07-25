import assert from 'node:assert/strict';
import test from 'node:test';
import { EventBus } from '../../src/core/EventBus.js';
import { GameStateMachine } from '../../src/core/GameStateMachine.js';
import { GAME_STATES } from '../../src/core/constants.js';

test('state machine allows the complete match lifecycle', () => {
  const machine = new GameStateMachine(new EventBus());
  machine.transition(GAME_STATES.COUNTDOWN);
  machine.transition(GAME_STATES.PLAYING);
  machine.transition(GAME_STATES.PAUSED);
  machine.transition(GAME_STATES.PLAYING);
  machine.transition(GAME_STATES.GAME_OVER);
  machine.transition(GAME_STATES.MENU);
  assert.equal(machine.state, GAME_STATES.MENU);
});

test('state machine rejects invalid transitions', () => {
  const machine = new GameStateMachine(new EventBus());
  assert.throws(
    () => machine.transition(GAME_STATES.GAME_OVER),
    /Invalid game-state transition/,
  );
});
