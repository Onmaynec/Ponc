import { INPUT_MODES } from '../core/constants.js';

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export class PhysicsSystem {
  constructor(config) {
    this.config = config;
  }

  update(model, commands, deltaSeconds) {
    this.updatePlayer(model.paddles.player, commands.player, deltaSeconds);
    this.updateAI(model.paddles.ai, commands.ai, deltaSeconds);
    this.updateBall(model.ball, deltaSeconds);
    this.resolvePaddleCollision(model.ball, model.paddles.player, 'player');
    this.resolvePaddleCollision(model.ball, model.paddles.ai, 'ai');
    return this.detectGoal(model.ball);
  }

  updatePlayer(paddle, command, deltaSeconds) {
    if (command.mode === INPUT_MODES.POINTER) {
      paddle.y = command.targetY - paddle.height / 2;
    } else {
      paddle.y += command.direction * this.config.paddle.playerSpeed * deltaSeconds;
    }
    paddle.y = clamp(paddle.y, 0, this.config.field.height - paddle.height);
  }

  updateAI(paddle, command, deltaSeconds) {
    const speed = Number.isFinite(command.speed)
      ? command.speed
      : this.config.paddle.aiSpeed;
    paddle.y += command.direction * speed * deltaSeconds;
    paddle.y = clamp(paddle.y, 0, this.config.field.height - paddle.height);
  }

  updateBall(ball, deltaSeconds) {
    ball.x += ball.vx * deltaSeconds;
    ball.y += ball.vy * deltaSeconds;

    if (ball.y - ball.radius <= 0 && ball.vy < 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
    } else if (ball.y + ball.radius >= this.config.field.height && ball.vy > 0) {
      ball.y = this.config.field.height - ball.radius;
      ball.vy = -Math.abs(ball.vy);
    }
  }

  resolvePaddleCollision(ball, paddle, side) {
    const isPlayer = side === 'player';
    const movingTowardPaddle = isPlayer ? ball.vx < 0 : ball.vx > 0;
    if (!movingTowardPaddle || !this.overlaps(ball, paddle)) return false;

    const speed = clamp(
      Math.hypot(ball.vx, ball.vy) + this.config.ball.speedIncrement,
      this.config.ball.initialSpeed,
      this.config.ball.maximumSpeed,
    );
    const paddleCenter = paddle.y + paddle.height / 2;
    const collisionRatio = clamp((ball.y - paddleCenter) / (paddle.height / 2), -1, 1);
    const angle = collisionRatio * this.config.ball.maximumBounceAngle;
    const direction = isPlayer ? 1 : -1;

    let vx =
      direction *
      Math.max(
        this.config.ball.minimumHorizontalSpeed,
        Math.abs(speed * Math.cos(angle)),
      );
    let vy = speed * Math.sin(angle);
    const resultingSpeed = Math.hypot(vx, vy);

    if (resultingSpeed > this.config.ball.maximumSpeed) {
      const scale = this.config.ball.maximumSpeed / resultingSpeed;
      vx *= scale;
      vy *= scale;
    }

    ball.vx = vx;
    ball.vy = vy;
    ball.x = isPlayer ? paddle.x + paddle.width + ball.radius : paddle.x - ball.radius;
    return true;
  }

  overlaps(ball, paddle) {
    return (
      ball.x - ball.radius < paddle.x + paddle.width &&
      ball.x + ball.radius > paddle.x &&
      ball.y - ball.radius < paddle.y + paddle.height &&
      ball.y + ball.radius > paddle.y
    );
  }

  detectGoal(ball) {
    if (ball.x + ball.radius < 0) return 'ai';
    if (ball.x - ball.radius > this.config.field.width) return 'player';
    return null;
  }
}
