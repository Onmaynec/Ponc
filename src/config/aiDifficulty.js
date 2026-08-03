export const DEFAULT_AI_DIFFICULTY = 'medium';

export const AI_DIFFICULTIES = Object.freeze({
  easy: Object.freeze({
    id: 'easy',
    label: 'Легко',
    speed: 210,
    reactionSeconds: 0.16,
    deadZone: 52,
    aimError: 42,
  }),
  medium: Object.freeze({
    id: 'medium',
    label: 'Средне',
    speed: 270,
    reactionSeconds: 0.08,
    deadZone: 30,
    aimError: 18,
  }),
  hard: Object.freeze({
    id: 'hard',
    label: 'Сложно',
    speed: 330,
    reactionSeconds: 0.035,
    deadZone: 14,
    aimError: 6,
  }),
});

export function normalizeAIDifficulty(value) {
  return Object.hasOwn(AI_DIFFICULTIES, value) ? value : DEFAULT_AI_DIFFICULTY;
}

export function getAIDifficultyProfile(value) {
  return AI_DIFFICULTIES[normalizeAIDifficulty(value)];
}
