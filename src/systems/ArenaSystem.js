// Deterministic arena hazards. No timers and no DOM dependencies.
export const ARENAS = Object.freeze({
  CLASSIC: 'classic',
  FLUX: 'flux',
});

const HAZARD_WIDTH = 16;
const HAZARD_HEIGHT = 92;
const HAZARD_SPEED = 118;
const MARGIN = 18;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export class ArenaSystem {
  constructor(config) {
    this.config = config;
    this.resetMatch();
  }

  resetMatch() {
    this.totalBounces = 0;
    this.resetRound();
  }

  resetRound() {
    const { width, height } = this.config.field;
    this.hazard = {
      x: width * 0.57,
      y: (height - HAZARD_HEIGHT) / 2,
      width: HAZARD_WIDTH,
      height: HAZARD_HEIGHT,
      velocityY: HAZARD_SPEED,
    };
  }

  step(deltaSeconds, ball) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return false;
    const hazard = this.hazard;
    const limit = this.config.field.height - hazard.height - MARGIN;
    hazard.y += hazard.velocityY * deltaSeconds;
    if (hazard.y < MARGIN || hazard.y > limit) {
      hazard.y = clamp(hazard.y, MARGIN, limit);
      hazard.velocityY *= -1;
    }
    const overlaps =
      ball.x + ball.radius >= hazard.x &&
      ball.x - ball.radius <= hazard.x + hazard.width &&
      ball.y + ball.radius >= hazard.y &&
      ball.y - ball.radius <= hazard.y + hazard.height;
    if (!overlaps || ball.vx === 0) return false;

    const incomingRight = ball.vx > 0;
    const centerX = hazard.x + hazard.width / 2;
    // Only collide when approaching the side of the bumper, not after leaving it.
    if (incomingRight && ball.x > centerX) return false;
    if (!incomingRight && ball.x < centerX) return false;

    const relativeHit = clamp(
      (ball.y - (hazard.y + hazard.height / 2)) / (hazard.height / 2),
      -1,
      1,
    );
    ball.x = incomingRight
      ? hazard.x - ball.radius - 0.1
      : hazard.x + hazard.width + ball.radius + 0.1;
    ball.vx = -ball.vx;
    ball.vy = clamp(
      ball.vy + relativeHit * 55 + hazard.velocityY * 0.1,
      -this.config.ball.maximumSpeed,
      this.config.ball.maximumSpeed,
    );
    const maxSpeed = this.config.ball.maximumSpeed * 1.25;
    const magnitude = Math.hypot(ball.vx, ball.vy);
    if (magnitude > maxSpeed) {
      const scale = maxSpeed / magnitude;
      ball.vx *= scale;
      ball.vy *= scale;
    }
    this.totalBounces += 1;
    return true;
  }

  snapshot(enabled) {
    return {
      enabled: Boolean(enabled),
      hazard: enabled ? { ...this.hazard } : null,
      totalBounces: this.totalBounces,
    };
  }
}
