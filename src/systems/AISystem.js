import { difficultyProfile } from '../core/MatchSettings.js';

export class AISystem {
  constructor(config) { this.config = config; }

  createCommand(snapshot) {
    const profile = difficultyProfile(snapshot.settings?.difficulty);
    const paddleCenter = snapshot.paddles.ai.y + snapshot.paddles.ai.height / 2;
    const ball = snapshot.ball;
    let targetY = ball.y;
    if (ball.vx > 0 && profile.prediction > 0) {
      const distance = snapshot.paddles.ai.x - ball.x;
      const travelTime = distance / Math.max(ball.vx, 1);
      const height = snapshot.field.height;
      const radius = ball.radius;
      const span = height - 2 * radius;
      const unbounded = ball.y - radius + ball.vy * travelTime;
      const folded = ((unbounded % (2 * span)) + 2 * span) % (2 * span);
      const predicted = radius + (folded <= span ? folded : 2 * span - folded);
      targetY = ball.y + (predicted - ball.y) * profile.prediction;
    }
    const distance = targetY - paddleCenter;
    return {
      direction: Math.abs(distance) <= this.config.paddle.aiDeadZone * profile.deadZoneFactor ? 0 : Math.sign(distance),
      speedFactor: profile.speedFactor,
    };
  }
}
