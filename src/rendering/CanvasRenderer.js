export class CanvasRenderer {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.config = config;
    if (!this.context) throw new Error('Canvas 2D context is unavailable.');
    this.trail = [];
    this.lastBallX = null;
  }

  render(snapshot) {
    const ctx = this.context;
    const { width, height } = snapshot.field;
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#0b1929');
    bg.addColorStop(0.5, '#10192c');
    bg.addColorStop(1, '#141126');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.strokeStyle = '#45677a25';
    ctx.lineWidth = 1;
    for (let x = 40; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 40; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.setLineDash([10, 12]);
    ctx.strokeStyle = '#d8f8ff49';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#cde8ff1c';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (this.lastBallX !== null && Math.abs(this.lastBallX - snapshot.ball.x) > 110)
      this.trail = [];
    this.lastBallX = snapshot.ball.x;
    if (snapshot.state === 'PLAYING') {
      this.trail.push({ x: snapshot.ball.x, y: snapshot.ball.y });
      if (this.trail.length > 12) this.trail.shift();
    } else if (snapshot.state !== 'PAUSED') this.trail = [];
    this.trail.forEach((p, i) => {
      ctx.fillStyle = `rgba(255, 214, 147, ${i / (this.trail.length * 5)})`;
      ctx.beginPath();
      ctx.arc(
        p.x,
        p.y,
        snapshot.ball.radius * (0.3 + i / (this.trail.length * 2)),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });
    this.drawPaddle(snapshot.paddles.player, '#50f0d6');
    this.drawPaddle(snapshot.paddles.ai, '#ff689c');
    this.drawBall(snapshot.ball);
  }

  drawPaddle(paddle, color) {
    const ctx = this.context;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    ctx.fillStyle = color;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.restore();
  }

  drawBall(ball) {
    const ctx = this.context;
    ctx.save();
    ctx.shadowColor = '#ffe2a9';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#fff5d5';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
