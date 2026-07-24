// Получение canvas и контекста
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const resetBtn = document.getElementById('resetBtn');
const playerScoreDisplay = document.getElementById('playerScore');
const computerScoreDisplay = document.getElementById('computerScore');

// Размеры canvas
canvas.width = 800;
canvas.height = 400;

// Игровые объекты
const paddleWidth = 10;
const paddleHeight = 80;
const ballSize = 8;

const player = {
    x: 10,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0,
    score: 0
};

const computer = {
    x: canvas.width - paddleWidth - 10,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0,
    score: 0,
    speed: 4
};

const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    dx: 5,
    dy: 5,
    size: ballSize
};

// Переменные для управления
let keys = {};
let mouseY = canvas.height / 2;

// Обработчики событий
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseY = e.clientY - rect.top;
});

resetBtn.addEventListener('click', resetGame);

// Функция сброса игры
function resetGame() {
    player.score = 0;
    computer.score = 0;
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * 5;
    ball.dy = (Math.random() - 0.5) * 8;
    updateScore();
}

// Функция обновления счета
function updateScore() {
    playerScoreDisplay.textContent = player.score;
    computerScoreDisplay.textContent = computer.score;
}

// Функция для проверки столкновений
function checkCollision(ball, paddle) {
    return (
        ball.x - ball.size < paddle.x + paddle.width &&
        ball.x + ball.size > paddle.x &&
        ball.y - ball.size < paddle.y + paddle.height &&
        ball.y + ball.size > paddle.y
    );
}

// Функция обновления позиций
function update() {
    // Управление левой ракеткой (игрок)
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        player.y = Math.max(0, player.y - 6);
    }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        player.y = Math.min(canvas.height - player.height, player.y + 6);
    }

    // Управление мышью
    player.y = Math.max(0, Math.min(canvas.height - player.height, mouseY - player.height / 2));

    // AI для компьютера
    const computerCenter = computer.y + computer.height / 2;
    if (computerCenter < ball.y - 35) {
        computer.y = Math.min(canvas.height - computer.height, computer.y + computer.speed);
    } else if (computerCenter > ball.y + 35) {
        computer.y = Math.max(0, computer.y - computer.speed);
    }

    // Обновление позиции мяча
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Столкновение с верхней и нижней стеной
    if (ball.y - ball.size < 0 || ball.y + ball.size > canvas.height) {
        ball.dy *= -1;
        ball.y = Math.max(ball.size, Math.min(canvas.height - ball.size, ball.y));
    }

    // Столкновение с левой ракеткой (игрок)
    if (checkCollision(ball, player)) {
        ball.dx *= -1;
        ball.x = player.x + player.width + ball.size;
        // Добавляем эффект спина
        const deltaY = ball.y - (player.y + player.height / 2);
        ball.dy = deltaY * 0.15;
    }

    // Столкновение с правой ракеткой (компьютер)
    if (checkCollision(ball, computer)) {
        ball.dx *= -1;
        ball.x = computer.x - ball.size;
        // Добавляем эффект спина
        const deltaY = ball.y - (computer.y + computer.height / 2);
        ball.dy = deltaY * 0.15;
    }

    // Проверка выхода мяча за границы (слева)
    if (ball.x - ball.size < 0) {
        computer.score++;
        updateScore();
        resetBall();
    }

    // Проверка выхода мяча за границы (справа)
    if (ball.x + ball.size > canvas.width) {
        player.score++;
        updateScore();
        resetBall();
    }
}

// Функция сброса позиции мяча
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * 5;
    ball.dy = (Math.random() - 0.5) * 8;
}

// Функция отрисовки
function draw() {
    // Очистка canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Рисование средней линии
    ctx.strokeStyle = '#00ff88';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Рисование левой ракетки (игрок)
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;

    // Рисование правой ракетки (компьютер)
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(computer.x, computer.y, computer.width, computer.height);
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 10;

    // Рисование мяча
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 15;

    // Отключение теней
    ctx.shadowColor = 'transparent';
}

// Основной игровой цикл
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Инициализация
updateScore();
gameLoop();
