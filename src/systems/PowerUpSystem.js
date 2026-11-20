// Power-ups run on the game's fixed-step clock; no browser timers or DOM dependencies.
export const POWERUP_TYPES = Object.freeze({
  EXPAND: 'expand',
  TURBO: 'turbo',
  SHIELD: 'shield',
});

const TYPES = Object.values(POWERUP_TYPES);
const START_DELAY = 5;
const NEXT_DELAY = 7;
const PICKUP_LIFETIME = 8;
const PICKUP_RADIUS = 15;
const EXPAND_SECONDS = 7;
const SHIELD_SECONDS = 9;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export class PowerUpSystem {
  constructor(config, random = Math.random) {
    this.config = config;
    this.random = random;
    this.resetMatch();
  }

  randomUnit() {
    return clamp(this.random(), 0, 0.999999);
  }

  resetMatch(model) {
    this.collected = { player: 0, ai: 0 };
    this.resetRound(model);
  }

  resetRound(model) {
    if (model) {
      for (const side of ['player', 'ai']) {
        this.setPaddleHeight(model.paddles[side], this.config.paddle.height);
      }
    }
    this.effects = {
      expand: { player: 0, ai: 0 },
      shield: { player: 0, ai: 0 },
    };
    this.pickup = null;
    this.spawnIn = START_DELAY;
  }

  setPaddleHeight(paddle, height) {
    if (!paddle) return;
    const center = paddle.y + paddle.height / 2;
    paddle.height = height;
    paddle.y = clamp(center - height / 2, 0, this.config.field.height - height);
  }

  spawn() {
    const width = this.config.field.width;
    const height = this.config.field.height;
    this.pickup = {
      type: TYPES[Math.floor(this.randomUnit() * TYPES.length)],
      x: width * (0.35 + this.randomUnit() * 0.3),
      y: 36 + this.randomUnit() * (height - 72),
      radius: PICKUP_RADIUS,
      lifetime: PICKUP_LIFETIME,
    };
  }

  step(deltaSeconds, model, lastHitter) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return null;
    for (const side of ['player', 'ai']) {
      const before = this.effects.expand[side];
      this.effects.expand[side] = Math.max(0, before - deltaSeconds);
      if (before > 0 && this.effects.expand[side] === 0) {
        this.setPaddleHeight(model.paddles[side], this.config.paddle.height);
      }
      this.effects.shield[side] = Math.max(0, this.effects.shield[side] - deltaSeconds);
    }

    if (!this.pickup) {
      this.spawnIn = Math.max(0, this.spawnIn - deltaSeconds);
      if (this.spawnIn === 0) this.spawn();
    } else {
      this.pickup.lifetime -= deltaSeconds;
      if (this.pickup.lifetime <= 0) {
        this.pickup = null;
        this.spawnIn = NEXT_DELAY;
      }
    }
    if (!this.pickup || !['player', 'ai'].includes(lastHitter)) return null;

    const ball = model.ball;
    const distance = Math.hypot(ball.x - this.pickup.x, ball.y - this.pickup.y);
    if (distance > ball.radius + this.pickup.radius) return null;

    const type = this.pickup.type;
    this.pickup = null;
    this.spawnIn = NEXT_DELAY;
    this.collected[lastHitter] += 1;
    switch (type) {
      case POWERUP_TYPES.EXPAND:
        this.effects.expand[lastHitter] = EXPAND_SECONDS;
        this.setPaddleHeight(
          model.paddles[lastHitter],
          this.config.paddle.height * 1.5,
        );
        break;
      case POWERUP_TYPES.TURBO: {
        const speed = Math.hypot(ball.vx, ball.vy);
        if (speed > 0) {
          const maximum = this.config.ball.maximumSpeed * 1.25;
          const factor = Math.min(1.35, maximum / speed);
          ball.vx *= factor;
          ball.vy *= factor;
        }
        break;
      }
      case POWERUP_TYPES.SHIELD:
        this.effects.shield[lastHitter] = SHIELD_SECONDS;
        break;
      default:
        break;
    }
    return { type, side: lastHitter };
  }

  blockGoal(goal, model) {
    if (goal !== 'player' && goal !== 'ai') return null;
    const defender = goal === 'ai' ? 'player' : 'ai';
    if (this.effects.shield[defender] <= 0) return null;
    this.effects.shield[defender] = 0;
    const ball = model.ball;
    const speed = Math.max(
      Math.abs(ball.vx),
      this.config.ball.minimumHorizontalSpeed,
    );
    ball.vx = defender === 'player' ? speed : -speed;
    ball.x =
      defender === 'player'
        ? ball.radius + 2
        : this.config.field.width - ball.radius - 2;
    ball.y = clamp(ball.y, ball.radius, this.config.field.height - ball.radius);
    return { side: defender };
  }

  getSnapshot(enabled) {
    return {
      enabled: Boolean(enabled),
      pickup: enabled && this.pickup ? { ...this.pickup } : null,
      collected: { ...this.collected },
      expand: { ...this.effects.expand },
      shield: { ...this.effects.shield },
    };
  }
}
