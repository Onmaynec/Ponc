export class CanvasRenderer {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.config = config;
    if (!this.context) throw new Error('Canvas 2D context is unavailable.');
  }

  render(snapshot) {
    const context = this.context;
    const { width, height } = snapshot.field;

    context.fillStyle = '#0a0e27';
    context.fillRect(0, 0, width, height);

    context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    context.setLineDash([10, 10]);
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(width / 2, 0);
    context.lineTo(width / 2, height);
    context.stroke();
    context.setLineDash([]);

    context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    context.lineWidth = 2;
    context.strokeRect(0, 0, width, height);

    this.drawPaddle(snapshot.paddles.player, '#00ff88', 'rgba(0, 255, 136, 0.6)');
    this.drawPaddle(snapshot.paddles.ai, '#ff0055', 'rgba(255, 0, 85, 0.6)');
    this.drawBall(snapshot.ball);
  }

  drawPaddle(paddle, color, glow) {
    const context = this.context;
    context.fillStyle = color;
    context.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    context.shadowColor = glow;
    context.shadowBlur = 15;
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
    context.shadowBlur = 0;
  }

  drawBall(ball) {
    const context = this.context;
    const gradient = context.createRadialGradient(
      ball.x - 2,
      ball.y - 2,
      0,
      ball.x,
      ball.y,
      ball.radius,
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#ffd700');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    context.lineWidth = 2;
    context.stroke();
  }
}
