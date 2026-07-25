export const GAME_STATES = Object.freeze({
  MENU: 'MENU',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
});

export const INPUT_MODES = Object.freeze({
  POINTER: 'POINTER',
  KEYBOARD: 'KEYBOARD',
});

export const GAME_EVENTS = Object.freeze({
  STATE_CHANGED: 'state:changed',
  GOAL: 'goal',
  SERVE_STARTED: 'serve:started',
  SERVE_ACTIVE: 'serve:active',
  PAUSED: 'game:paused',
  RESUMED: 'game:resumed',
  GAME_OVER: 'game:over',
  RESET: 'game:reset',
});
