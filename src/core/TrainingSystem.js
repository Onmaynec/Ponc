// Fixed-step, single-player drills. Training scores never affect the regular career.
export const TRAINING_SECONDS = 60;
export const TRAINING_LIVES = 3;
export const TRAINING_DRILLS = Object.freeze({
  PRECISION: 'precision',
  RALLY: 'rally',
  REFLEX: 'reflex',
});

export const DRILL_PROFILES = Object.freeze({
  [TRAINING_DRILLS.PRECISION]: Object.freeze({
    name: 'Меткость',
    difficulty: 'normal',
    description: 'Попадайте в подсвеченную зону ворот. Точное попадание даёт 3 очка, обычное — 1.',
  }),
  [TRAINING_DRILLS.RALLY]: Object.freeze({
    name: 'Контроль',
    difficulty: 'normal',
    description: 'Каждый отбив мяча приносит 1 очко, каждые 5 отбиваний подряд — ещё 5.',
  }),
  [TRAINING_DRILLS.REFLEX]: Object.freeze({
    name: 'Реакция',
    difficulty: 'hard',
    description: 'Отбивайте мячи эксперта: 2 очка за защиту. Три пропущенных мяча завершают тренировку.',
  }),
});

export function normalizeDrill(value) {
  return Object.values(TRAINING_DRILLS).includes(value)
    ? value
    : TRAINING_DRILLS.PRECISION;
}

export class TrainingSystem {
  constructor() {
    this.reset(TRAINING_DRILLS.PRECISION);
  }

  reset(drill) {
    this.drill = normalizeDrill(drill);
    this.remainingSeconds = TRAINING_SECONDS;
    this.points = 0;
    this.saves = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.lives = TRAINING_LIVES;
    this.shots = 0;
    this.accurateShots = 0;
    this.target = 'top';
  }

  tick(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return false;
    this.remainingSeconds = Math.max(0, this.remainingSeconds - deltaSeconds);
    return this.remainingSeconds === 0;
  }

  onPaddleHit(side) {
    if (side !== 'player') return null;
    this.saves += 1;
    this.streak += 1;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    if (this.drill === TRAINING_DRILLS.RALLY) {
      const points = 1 + (this.streak % 5 === 0 ? 5 : 0);
      this.points += points;
      return { kind: 'rally', points, streak: this.streak };
    }
    if (this.drill === TRAINING_DRILLS.REFLEX) {
      this.points += 2;
      return { kind: 'reflex', points: 2, streak: this.streak };
    }
    return null;
  }

  onGoal(side, ballY, fieldHeight) {
    this.streak = 0;
    if (side === 'player') {
      this.shots += 1;
      if (this.drill !== TRAINING_DRILLS.PRECISION) return null;
      const accurate = Number.isFinite(ballY) && Number.isFinite(fieldHeight) &&
        fieldHeight > 0 && (this.target === 'top'
          ? ballY <= fieldHeight * 0.34
          : ballY >= fieldHeight * 0.66);
      const points = accurate ? 3 : 1;
      this.points += points;
      if (accurate) this.accurateShots += 1;
      this.target = this.target === 'top' ? 'bottom' : 'top';
      return { kind: 'precision', points, accurate };
    }
    if (side === 'ai' && this.drill === TRAINING_DRILLS.REFLEX)
      this.lives = Math.max(0, this.lives - 1);
    return null;
  }

  get accuracy() {
    return this.shots > 0 ? Math.round((this.accurateShots / this.shots) * 100) : 0;
  }

  snapshot(enabled) {
    return {
      enabled: Boolean(enabled),
      drill: this.drill,
      name: DRILL_PROFILES[this.drill].name,
      points: this.points,
      remainingSeconds: this.remainingSeconds,
      saves: this.saves,
      streak: this.streak,
      bestStreak: this.bestStreak,
      shots: this.shots,
      accurateShots: this.accurateShots,
      accuracy: this.accuracy,
      target: this.target,
      lives: this.lives,
    };
  }
}
