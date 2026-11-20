export const GAME_MODES = Object.freeze({ SOLO: 'solo', LOCAL: 'local' });
export const DIFFICULTIES = Object.freeze({ EASY: 'easy', NORMAL: 'normal', HARD: 'hard' });
export const WINNING_SCORES = Object.freeze([5, 7, 11, 15]);
export const DEFAULT_SETTINGS = Object.freeze({ mode: GAME_MODES.SOLO, difficulty: DIFFICULTIES.NORMAL, winningScore: 11 });

export function normalizeSettings(input = {}) {
  return {
    mode: Object.values(GAME_MODES).includes(input.mode) ? input.mode : DEFAULT_SETTINGS.mode,
    difficulty: Object.values(DIFFICULTIES).includes(input.difficulty) ? input.difficulty : DEFAULT_SETTINGS.difficulty,
    winningScore: WINNING_SCORES.includes(Number(input.winningScore)) ? Number(input.winningScore) : DEFAULT_SETTINGS.winningScore,
  };
}

export function difficultyProfile(difficulty) {
  switch (difficulty) {
    case DIFFICULTIES.EASY: return { speedFactor: 0.65, deadZoneFactor: 1.9, prediction: 0 };
    case DIFFICULTIES.HARD: return { speedFactor: 1.28, deadZoneFactor: 0.45, prediction: 1 };
    default: return { speedFactor: 1, deadZoneFactor: 1, prediction: 0.45 };
  }
}
