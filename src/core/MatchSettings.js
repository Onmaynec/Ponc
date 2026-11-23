import { ARENAS } from '../systems/ArenaSystem.js';
import { normalizeDrill } from './TrainingSystem.js';

export const GAME_MODES = Object.freeze({ SOLO: 'solo', LOCAL: 'local' });
export const DIFFICULTIES = Object.freeze({
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
});
export const RULESETS = Object.freeze({
  CLASSIC: 'classic',
  SUDDEN_DEATH: 'sudden',
  TIME_ATTACK: 'timed',
  SURVIVAL: 'survival',
  CIRCUIT: 'circuit',
  TRAINING: 'training',
});
export const TIME_ATTACK_SECONDS = 90;
export const SURVIVAL_LIVES = 3;
export const WINNING_SCORES = Object.freeze([5, 7, 11, 15]);
export const DEFAULT_SETTINGS = Object.freeze({
  mode: GAME_MODES.SOLO,
  difficulty: DIFFICULTIES.NORMAL,
  winningScore: 11,
  ruleset: RULESETS.CLASSIC,
  powerUps: false,
  arena: ARENAS.CLASSIC,
  drill: 'precision',
});

export function normalizeSettings(input = {}) {
  const ruleset = Object.values(RULESETS).includes(input.ruleset)
    ? input.ruleset
    : DEFAULT_SETTINGS.ruleset;
  const training = ruleset === RULESETS.TRAINING;
  const soloOnly = training || ruleset === RULESETS.CIRCUIT;
  return {
    drill: normalizeDrill(input.drill),
    arena: training
      ? ARENAS.CLASSIC
      : Object.values(ARENAS).includes(input.arena)
        ? input.arena
        : DEFAULT_SETTINGS.arena,
    powerUps: !training && (input.powerUps === true || input.powerUps === 'on'),
    ruleset,
    mode:
      soloOnly
        ? GAME_MODES.SOLO
        : Object.values(GAME_MODES).includes(input.mode)
          ? input.mode
          : DEFAULT_SETTINGS.mode,
    difficulty: Object.values(DIFFICULTIES).includes(input.difficulty)
      ? input.difficulty
      : DEFAULT_SETTINGS.difficulty,
    winningScore: WINNING_SCORES.includes(Number(input.winningScore))
      ? Number(input.winningScore)
      : DEFAULT_SETTINGS.winningScore,
  };
}

export function difficultyProfile(difficulty) {
  switch (difficulty) {
    case DIFFICULTIES.EASY:
      return { speedFactor: 0.65, deadZoneFactor: 1.9, prediction: 0 };
    case DIFFICULTIES.HARD:
      return { speedFactor: 1.28, deadZoneFactor: 0.45, prediction: 1 };
    default:
      return { speedFactor: 1, deadZoneFactor: 1, prediction: 0.45 };
  }
}
