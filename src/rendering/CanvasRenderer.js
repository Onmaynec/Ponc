export class CanvasRenderer {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.config = config;
    if (!this.context) throw new Error('Canvas 2D context is unavailable.');
    this.trail = [];
    this.lastBallX = null;
    this.palette = 'neon';
  }

  setPalette(value) {
    this.palette = ['neon', 'retro', 'mono'].includes(value) ? value : 'neon';
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
    const colors = {
      neon: ['#50f0d6', '#ff689c'],
      retro: ['#ffd166', '#ef476f'],
      mono: ['#ffffff', '#9baab8'],
    }[this.palette];
    this.drawPaddle(snapshot.paddles.player, colors[0]);
    this.drawPaddle(snapshot.paddles.ai, colors[1]);
    if (snapshot.powerUps?.enabled) {
      this.drawPowerUp(snapshot.powerUps.pickup);
      this.drawShield(snapshot.powerUps.shield, snapshot.field);
    }
    this.drawBall(snapshot.ball);
  }

  drawPowerUp(pickup) {
    if (!pickup) return;
    const ctx = this.context;
    const colors = { expand: '#61ead4', turbo: '#ffd166', shield: '#9f89ff' };
    const glyphs = { expand: '+', turbo: '»', shield: '◆' };
    const color = colors[pickup.type] || '#ffffff';
    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, pickup.radius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0c1725';
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, pickup.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = 'bold 19px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyphs[pickup.type] || '?', pickup.x, pickup.y + 1);
    ctx.restore();
  }

  drawShield(shields, field) {
    const ctx = this.context;
    for (const [side, seconds] of Object.entries(shields)) {
      if (seconds <= 0) continue;
      const x = side === 'player' ? 7 : field.width - 7;
      ctx.save();
      ctx.shadowColor = '#9b8cff';
      ctx.shadowBlur = 25;
      ctx.strokeStyle = '#a89aff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, 16);
      ctx.lineTo(x, field.height - 16);
      ctx.stroke();
      ctx.restore();
    }
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
