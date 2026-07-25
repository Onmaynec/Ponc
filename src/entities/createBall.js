export function createBall(config) {
  return {
    x: config.field.width / 2,
    y: config.field.height / 2,
    vx: config.ball.initialSpeed,
    vy: 0,
    radius: config.ball.radius,
  };
}
