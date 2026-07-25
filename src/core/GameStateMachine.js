import { GAME_EVENTS, GAME_STATES } from './constants.js';

const TRANSITIONS = Object.freeze({
  [GAME_STATES.MENU]: new Set([GAME_STATES.COUNTDOWN]),
  [GAME_STATES.COUNTDOWN]: new Set([
    GAME_STATES.PLAYING,
    GAME_STATES.PAUSED,
    GAME_STATES.MENU,
  ]),
  [GAME_STATES.PLAYING]: new Set([
    GAME_STATES.COUNTDOWN,
    GAME_STATES.PAUSED,
    GAME_STATES.GAME_OVER,
    GAME_STATES.MENU,
  ]),
  [GAME_STATES.PAUSED]: new Set([
    GAME_STATES.COUNTDOWN,
    GAME_STATES.PLAYING,
    GAME_STATES.MENU,
  ]),
  [GAME_STATES.GAME_OVER]: new Set([GAME_STATES.COUNTDOWN, GAME_STATES.MENU]),
});

export class GameStateMachine {
  constructor(eventBus, initialState = GAME_STATES.MENU) {
    this.eventBus = eventBus;
    this.state = initialState;
  }

  canTransition(nextState) {
    return TRANSITIONS[this.state]?.has(nextState) ?? false;
  }

  transition(nextState, metadata = {}) {
    if (nextState === this.state) {
      return false;
    }

    if (!this.canTransition(nextState)) {
      throw new Error(`Invalid game-state transition: ${this.state} -> ${nextState}`);
    }

    const previousState = this.state;
    this.state = nextState;
    this.eventBus.emit(GAME_EVENTS.STATE_CHANGED, {
      previousState,
      state: nextState,
      ...metadata,
    });
    return true;
  }
}
