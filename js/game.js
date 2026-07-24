// ========================================
// PONC - Pong Game
// ========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ========================================
// CONSTANTS
// ========================================

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

const BALL_SIZE = 8;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;

const INITIAL_BALL_SPEED = 5;
const MAX_BALL_SPEED = 8;
const AI_SPEED = 4.5;
const PLAYER_SPEED = 6;

const PADDLE_PADDING = 20;
const CENTER_LINE_WIDTH = 2;

// ========================================
// GAME STATE
// ========================================

const game = {
    playerScore: 0,
    aiScore: 0,
    gameRunning: true
};

// ========================================
// BALL OBJECT
// ========================================

const ball = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    vx: INITIAL_BALL_SPEED,
    vy: INITIAL_BALL_SPEED,
    size: BALL_SIZE,
    speed: INITIAL_BALL_SPEED,

    reset: function() {
        this.x = CANVAS_WIDTH / 2;
        this.y = CANVAS_HEIGHT / 2;
        // Случайное направление
        const angle = (Math.random() - 0.5) * Math.PI / 4;
        const direction = Math.random() > 0.5 ? 1 : -1;
        this.vx = INITIAL_BALL_SPEED * direction * Math.cos(angle);
        this.vy = INITIAL_BALL_SPEED * Math.sin(angle);
        this.speed = INITIAL_BALL_SPEED;
    },

    update: function() {
        // Обновление позиции
        this.x += this.vx;
        this.y += this.vy;

        // Столкновение с верхней и нижней стеной
        if (this.y - this.size <= 0 || this.y + this.size >= CANVAS_HEIGHT) {
            this.vy = -this.vy;
            // Предотвращение застревания в стене
            this.y = Math.max(this.size, Math.min(CANVAS_HEIGHT - this.size, this.y));
        }
    },

    draw: function() {
        // Градиент для мяча
        const gradient = ctx.createRadialGradient(this.x - 2, this.y - 2, 0, this.x, this.y, this.size);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#ffd700');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Свечение
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
};

// ========================================
// PADDLE OBJECTS
// ========================================

const playerPaddle = {
    x: PADDLE_PADDING,
    y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    vy: 0,
    maxSpeed: PLAYER_SPEED,

    update: function() {
        this.y += this.vy;
        // Граница движения
        this.y = Math.max(0, Math.min(CANVAS_HEIGHT - this.height, this.y));
    },

    draw: function() {
        // Основной цвет
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Свечение
        ctx.shadowColor = 'rgba(0, 255, 136, 0.6)';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
};

const aiPaddle = {
    x: CANVAS_WIDTH - PADDLE_PADDING - PADDLE_WIDTH,
    y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    vy: 0,
    speed: AI_SPEED,

    update: function() {
        const paddleCenter = this.y + this.height / 2;
        const ballCenter = ball.y;
        const distance = ballCenter - paddleCenter;
        
        // AI следит за мячом с некоторой ошибкой
        const deadZone = 30;
        if (Math.abs(distance) > deadZone) {
            if (distance > 0) {
                this.y += this.speed;
            } else {
                this.y -= this.speed;
            }
        }
        
        // Граница движения
        this.y = Math.max(0, Math.min(CANVAS_HEIGHT - this.height, this.y));
    },

    draw: function() {
        // Основной цвет
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Свечение
        ctx.shadowColor = 'rgba(255, 0, 85, 0.6)';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = 'rgba(255, 0, 85, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
};

// ========================================
// COLLISION DETECTION
// ========================================

function checkPaddleCollision(paddle, isPlayer = true) {
    if (ball.x - ball.size < paddle.x + paddle.width &&
        ball.x + ball.size > paddle.x &&
        ball.y - ball.size < paddle.y + paddle.height &&
        ball.y + ball.size > paddle.y) {
        
        // Отскок мяча
        ball.vx = -ball.vx;
        
        // Усиление мяча при каждом отскоке
        if (ball.speed < MAX_BALL_SPEED) {
            ball.speed += 0.3;
            ball.vx = ball.vx > 0 ? ball.speed : -ball.speed;
        }
        
        // Придание углового направления в зависимости от точки попадания
        const paddleCenter = paddle.y + paddle.height / 2;
        const collidePoint = ball.y - paddleCenter;
        const collidePercent = collidePoint / (paddle.height / 2);
        const maxAngle = Math.PI / 4; // 45 градусов
        const angle = collidePercent * maxAngle;
        
        const direction = ball.vx > 0 ? 1 : -1;
        ball.vx = direction * ball.speed * Math.cos(angle);
        ball.vy = ball.speed * Math.sin(angle);
        
        // Предотвращение застревания в ракетке
        if (isPlayer) {
            ball.x = paddle.x + paddle.width + ball.size;
        } else {
            ball.x = paddle.x - ball.size;
        }
        
        return true;
    }
    return false;
}

function checkBoundaries() {
    // Если мяч вышел влево - очко AI
    if (ball.x - ball.size < 0) {
        game.aiScore++;
        updateScore();
        ball.reset();
        return;
    }
    
    // Если мяч вышел вправо - очко игрока
    if (ball.x + ball.size > CANVAS_WIDTH) {
        game.playerScore++;
        updateScore();
        ball.reset();
        return;
    }
}

// ========================================
// INPUT HANDLING
// ========================================

const keys = {};
let mouseY = CANVAS_HEIGHT / 2;

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // Новая игра на R
    if (e.key.toLowerCase() === 'r') {
        resetGame();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseY = e.clientY - rect.top;
});

// ========================================
// UPDATE & DRAW
// ========================================

function update() {
    // Обновление игрока
    playerPaddle.vy = 0;
    
    if (keys['ArrowUp']) {
        playerPaddle.vy = -playerPaddle.maxSpeed;
    }
    if (keys['ArrowDown']) {
        playerPaddle.vy = playerPaddle.maxSpeed;
    }
    
    // Движение с мышью (плавное)
    const paddleCenter = playerPaddle.y + playerPaddle.height / 2;
    const diff = mouseY - paddleCenter;
    if (Math.abs(diff) > 5) {
        playerPaddle.vy = Math.sign(diff) * playerPaddle.maxSpeed;
    }
    
    playerPaddle.update();
    aiPaddle.update();
    ball.update();
    
    // Проверка столкновений с ракетками
    checkPaddleCollision(playerPaddle, true);
    checkPaddleCollision(aiPaddle, false);
    
    // Проверка границ поля
    checkBoundaries();
}

function draw() {
    // Фон
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Центральная линия
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = CENTER_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Граница поля
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Объекты игры
    playerPaddle.draw();
    aiPaddle.draw();
    ball.draw();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ========================================
// SCORE & RESET
// ========================================

function updateScore() {
    document.getElementById('playerScore').textContent = game.playerScore;
    document.getElementById('aiScore').textContent = game.aiScore;
}

function resetGame() {
    game.playerScore = 0;
    game.aiScore = 0;
    ball.reset();
    updateScore();
}

// ========================================
// INITIALIZATION
// ========================================

window.addEventListener('DOMContentLoaded', () => {
    updateScore();
    gameLoop();
});

// Обработка потери фокуса
window.addEventListener('blur', () => {
    Object.keys(keys).forEach(key => keys[key] = false);
});
