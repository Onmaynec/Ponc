import {
  DEFAULT_AI_DIFFICULTY,
  getAIDifficultyProfile,
  normalizeAIDifficulty,
} from '../config/aiDifficulty.js';

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export class AISystem {
  constructor(config, { difficulty = DEFAULT_AI_DIFFICULTY, random = Math.random } = {}) {
    this.config = config;
    this.random = random;
    this.setDifficulty(difficulty);
  }

  setDifficulty(difficulty) {
    this.difficulty = normalizeAIDifficulty(difficulty);
    this.profile = getAIDifficultyProfile(this.difficulty);
    this.reset();
    return this.difficulty;
  }

  reset() {
    this.targetY = this.config.field.height / 2;
    this.reactionRemainingSeconds = 0;
  }

  createCommand(snapshot, deltaSeconds = this.config.loop.fixedStepSeconds) {
    this.reactionRemainingSeconds = Math.max(
      0,
      this.reactionRemainingSeconds - Math.max(0, deltaSeconds),
    );

    if (this.reactionRemainingSeconds === 0) {
      const aimOffset = (this.random() * 2 - 1) * this.profile.aimError;
      this.targetY = clamp(snapshot.ball.y + aimOffset, 0, snapshot.field.height);
      this.reactionRemainingSeconds = this.profile.reactionSeconds;
    }

    const paddleCenter = snapshot.paddles.ai.y + snapshot.paddles.ai.height / 2;
    const distance = this.targetY - paddleCenter;

    return {
      direction: Math.abs(distance) <= this.profile.deadZone ? 0 : Math.sign(distance),
      speed: this.profile.speed,
    };
  }
}
