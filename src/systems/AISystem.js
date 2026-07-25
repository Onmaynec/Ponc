export class AISystem {
  constructor(config) {
    this.config = config;
  }

  createCommand(snapshot) {
    const paddleCenter = snapshot.paddles.ai.y + snapshot.paddles.ai.height / 2;
    const distance = snapshot.ball.y - paddleCenter;

    return {
      direction:
        Math.abs(distance) <= this.config.paddle.aiDeadZone ? 0 : Math.sign(distance),
    };
  }
}
