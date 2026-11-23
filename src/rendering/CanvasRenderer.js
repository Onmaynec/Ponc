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
    if (snapshot.arena?.hazard) this.drawArenaHazard(snapshot.arena.hazard);
    if (snapshot.arena?.portals) this.drawPortals(snapshot.arena.portals);
    if (snapshot.training?.enabled)
      this.drawTrainingOverlay(snapshot.training, snapshot.field);
    if (snapshot.settings.ruleset === 'survival')
      this.drawSurvivalIndicator(snapshot.survivalLives);
    this.drawBall(snapshot.ball);
  }

  drawTrainingOverlay(training, field) {
    const ctx = this.context;
    if (training.drill === 'precision') {
      const top = training.target === 'top';
      const height = field.height * 0.34;
      const y = top ? 0 : field.height - height;
      ctx.save();
      const gradient = ctx.createLinearGradient(field.width - 90, 0, field.width, 0);
      gradient.addColorStop(0, 'rgba(78,238,198,0)');
      gradient.addColorStop(1, 'rgba(78,238,198,0.21)');
      ctx.fillStyle = gradient;
      ctx.fillRect(field.width - 90, y, 90, height);
      ctx.shadowColor = '#68ffd5';
      ctx.shadowBlur = 23;
      ctx.strokeStyle = '#68ffd5';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(field.width - 4, y + 4);
      ctx.lineTo(field.width - 4, y + height - 4);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillStyle = '#e3fffa';
      ctx.textAlign = 'right';
      ctx.fillText('x3 TARGET', field.width - 17, top ? 26 : field.height - 14);
      ctx.restore();
    }
    if (training.drill === 'reflex') {
      ctx.save();
      ctx.strokeStyle = '#ffbf8c';
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 9, 9, field.height - 18);
      ctx.restore();
    }
  }

  drawPortals(portals) {
    const ctx = this.context;
    const colors = ['#7d8bff', '#f185d7'];
    portals.forEach((portal, index) => {
      ctx.save();
      ctx.strokeStyle = colors[index];
      ctx.shadowColor = colors[index];
      ctx.shadowBlur = 25;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(portal.x, portal.y, portal.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#d8e5ffac';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(portal.x, portal.y, portal.radius - 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  drawArenaHazard(hazard) {
    if (!hazard) return;
    const ctx = this.context;
    const { x, y, width, height } = hazard;
    ctx.save();
    ctx.shadowColor = '#ffb764';
    ctx.shadowBlur = 35;
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, '#ffd996');
    gradient.addColorStop(0.5, '#ff9b59');
    gradient.addColorStop(1, '#d95c73');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#552944';
    for (let cy = y + 9; cy < y + height - 4; cy += 15) {
      ctx.fillRect(x + 4, cy, width - 8, 5);
    }
    ctx.restore();
  }

  drawSurvivalIndicator(lives) {
    const ctx = this.context;
    ctx.save();
    ctx.fillStyle = '#ffcf78';
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `ЖИЗНИ: ${'♥'.repeat(lives)}${'♡'.repeat(3 - lives)}`,
      this.config.field.width / 2,
      25,
    );
    ctx.restore();
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
