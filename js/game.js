// ========================================
// PONC - Pong Game 1.0.1
// ========================================

(() => {
    'use strict';

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) {
        console.error('Ponc: Canvas is unavailable.');
        return;
    }

    const elements = {
        playerScore: document.getElementById('playerScore'),
        aiScore: document.getElementById('aiScore'),
        menuOverlay: document.getElementById('menuOverlay'),
        pauseOverlay: document.getElementById('pauseOverlay'),
        gameOverOverlay: document.getElementById('gameOverOverlay'),
        countdown: document.getElementById('countdown'),
        stateBadge: document.getElementById('stateBadge'),
        resultTitle: document.getElementById('resultTitle'),
        resultScore: document.getElementById('resultScore'),
        startButton: document.getElementById('startButton'),
        pauseButton: document.getElementById('pauseButton'),
        restartButton: document.getElementById('restartButton'),
        resumeButton: document.getElementById('resumeButton'),
        pauseRestartButton: document.getElementById('pauseRestartButton'),
        pauseMenuButton: document.getElementById('pauseMenuButton'),
        replayButton: document.getElementById('replayButton'),
        gameOverMenuButton: document.getElementById('gameOverMenuButton')
    };

    const GAME_STATES = Object.freeze({
        MENU: 'MENU',
        COUNTDOWN: 'COUNTDOWN',
        PLAYING: 'PLAYING',
        PAUSED: 'PAUSED',
        GAME_OVER: 'GAME_OVER'
    });

    const INPUT_MODES = Object.freeze({
        POINTER: 'POINTER',
        KEYBOARD: 'KEYBOARD'
    });

    const CONFIG = Object.freeze({
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        ballSize: 8,
        paddleWidth: 10,
        paddleHeight: 80,
        initialBallSpeed: 5,
        maxBallSpeed: 8,
        minHorizontalBallSpeed: 3.2,
        aiSpeed: 4.5,
        playerSpeed: 6,
        paddlePadding: 20,
        centerLineWidth: 2,
        winningScore: 11,
        countdownDurationMs: 2000,
        maxFrameDeltaMs: 50
    });

    const stateLabels = Object.freeze({
        [GAME_STATES.MENU]: 'Меню',
        [GAME_STATES.COUNTDOWN]: 'Подача',
        [GAME_STATES.PLAYING]: 'Игра',
        [GAME_STATES.PAUSED]: 'Пауза',
        [GAME_STATES.GAME_OVER]: 'Матч завершён'
    });

    const game = {
        state: GAME_STATES.MENU,
        pausedFromState: GAME_STATES.PLAYING,
        playerScore: 0,
        aiScore: 0,
        winner: null,
        countdownRemainingMs: CONFIG.countdownDurationMs,
        inputMode: INPUT_MODES.POINTER,
        pointerY: CONFIG.canvasHeight / 2,
        lastTimestamp: null,
        animationFrameId: null
    };

    const keys = {
        ArrowUp: false,
        ArrowDown: false
    };

    const ball = {
        x: CONFIG.canvasWidth / 2,
        y: CONFIG.canvasHeight / 2,
        vx: CONFIG.initialBallSpeed,
        vy: 0,
        size: CONFIG.ballSize,

        reset() {
            this.x = CONFIG.canvasWidth / 2;
            this.y = CONFIG.canvasHeight / 2;

            const angle = (Math.random() - 0.5) * (Math.PI / 3);
            const direction = Math.random() >= 0.5 ? 1 : -1;
            this.vx = CONFIG.initialBallSpeed * direction * Math.cos(angle);
            this.vy = CONFIG.initialBallSpeed * Math.sin(angle);
        },

        update(frameScale) {
            this.x += this.vx * frameScale;
            this.y += this.vy * frameScale;

            if (this.y - this.size <= 0 && this.vy < 0) {
                this.y = this.size;
                this.vy = Math.abs(this.vy);
            } else if (this.y + this.size >= CONFIG.canvasHeight && this.vy > 0) {
                this.y = CONFIG.canvasHeight - this.size;
                this.vy = -Math.abs(this.vy);
            }
        },

        draw() {
            const gradient = ctx.createRadialGradient(this.x - 2, this.y - 2, 0, this.x, this.y, this.size);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#ffd700');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    };

    const playerPaddle = {
        x: CONFIG.paddlePadding,
        y: CONFIG.canvasHeight / 2 - CONFIG.paddleHeight / 2,
        width: CONFIG.paddleWidth,
        height: CONFIG.paddleHeight,
        speed: CONFIG.playerSpeed,

        reset() {
            this.y = CONFIG.canvasHeight / 2 - this.height / 2;
        },

        draw() {
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(this.x, this.y, this.width, this.height);

            ctx.shadowColor = 'rgba(0, 255, 136, 0.6)';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = 'rgba(0, 255, 136, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            ctx.shadowBlur = 0;
        }
    };

    const aiPaddle = {
        x: CONFIG.canvasWidth - CONFIG.paddlePadding - CONFIG.paddleWidth,
        y: CONFIG.canvasHeight / 2 - CONFIG.paddleHeight / 2,
        width: CONFIG.paddleWidth,
        height: CONFIG.paddleHeight,
        speed: CONFIG.aiSpeed,

        reset() {
            this.y = CONFIG.canvasHeight / 2 - this.height / 2;
        },

        update(frameScale) {
            const paddleCenter = this.y + this.height / 2;
            const distance = ball.y - paddleCenter;
            const deadZone = 30;

            if (Math.abs(distance) > deadZone) {
                this.y += Math.sign(distance) * this.speed * frameScale;
            }

            this.y = clamp(this.y, 0, CONFIG.canvasHeight - this.height);
        },

        draw() {
            ctx.fillStyle = '#ff0055';
            ctx.fillRect(this.x, this.y, this.width, this.height);

            ctx.shadowColor = 'rgba(255, 0, 85, 0.6)';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            ctx.shadowBlur = 0;
        }
    };

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function clearPressedKeys() {
        keys.ArrowUp = false;
        keys.ArrowDown = false;
    }

    function resetPositions() {
        playerPaddle.reset();
        aiPaddle.reset();
        ball.reset();
        game.pointerY = CONFIG.canvasHeight / 2;
    }

    function resetScores() {
        game.playerScore = 0;
        game.aiScore = 0;
        game.winner = null;
        updateScore();
    }

    function updateScore() {
        elements.playerScore.textContent = String(game.playerScore);
        elements.aiScore.textContent = String(game.aiScore);
    }

    function setState(nextState) {
        if (!Object.values(GAME_STATES).includes(nextState)) {
            throw new Error(`Ponc: unknown game state "${nextState}".`);
        }

        game.state = nextState;
        game.lastTimestamp = null;
        updateInterface();
    }

    function beginCountdown() {
        ball.reset();
        game.countdownRemainingMs = CONFIG.countdownDurationMs;
        setState(GAME_STATES.COUNTDOWN);
    }

    function startMatch() {
        clearPressedKeys();
        resetScores();
        resetPositions();
        beginCountdown();
        canvas.focus({ preventScroll: true });
    }

    function restartMatch() {
        startMatch();
    }

    function returnToMenu() {
        clearPressedKeys();
        resetScores();
        resetPositions();
        setState(GAME_STATES.MENU);
    }

    function pauseGame() {
        if (game.state !== GAME_STATES.PLAYING && game.state !== GAME_STATES.COUNTDOWN) {
            return false;
        }

        game.pausedFromState = game.state;
        clearPressedKeys();
        setState(GAME_STATES.PAUSED);
        return true;
    }

    function resumeGame() {
        if (game.state !== GAME_STATES.PAUSED) {
            return false;
        }

        const resumeState = game.pausedFromState === GAME_STATES.COUNTDOWN
            ? GAME_STATES.COUNTDOWN
            : GAME_STATES.PLAYING;
        setState(resumeState);
        canvas.focus({ preventScroll: true });
        return true;
    }

    function togglePause() {
        if (game.state === GAME_STATES.PAUSED) {
            resumeGame();
        } else {
            pauseGame();
        }
    }

    function finishMatch(winner) {
        game.winner = winner;
        clearPressedKeys();
        setState(GAME_STATES.GAME_OVER);
    }

    function awardPoint(side) {
        if (game.state !== GAME_STATES.PLAYING) {
            return false;
        }

        if (side === 'player') {
            game.playerScore += 1;
        } else if (side === 'ai') {
            game.aiScore += 1;
        } else {
            throw new Error(`Ponc: unknown scoring side "${side}".`);
        }

        updateScore();

        if (game.playerScore >= CONFIG.winningScore) {
            finishMatch('player');
        } else if (game.aiScore >= CONFIG.winningScore) {
            finishMatch('ai');
        } else {
            beginCountdown();
        }

        return true;
    }

    function updateCountdown(deltaMs) {
        if (game.state !== GAME_STATES.COUNTDOWN) {
            return;
        }

        game.countdownRemainingMs = Math.max(0, game.countdownRemainingMs - deltaMs);
        elements.countdown.textContent = String(Math.max(1, Math.ceil(game.countdownRemainingMs / 1000)));

        if (game.countdownRemainingMs === 0) {
            setState(GAME_STATES.PLAYING);
        }
    }

    function updatePlayerPaddle(frameScale) {
        if (game.inputMode === INPUT_MODES.KEYBOARD) {
            const direction = Number(keys.ArrowDown) - Number(keys.ArrowUp);
            playerPaddle.y += direction * playerPaddle.speed * frameScale;
        } else {
            playerPaddle.y = game.pointerY - playerPaddle.height / 2;
        }

        playerPaddle.y = clamp(playerPaddle.y, 0, CONFIG.canvasHeight - playerPaddle.height);
    }

    function isBallOverlappingPaddle(paddle) {
        return ball.x - ball.size < paddle.x + paddle.width
            && ball.x + ball.size > paddle.x
            && ball.y - ball.size < paddle.y + paddle.height
            && ball.y + ball.size > paddle.y;
    }

    function checkPaddleCollision(paddle, side) {
        const isPlayer = side === 'player';
        const movingTowardPaddle = isPlayer ? ball.vx < 0 : ball.vx > 0;

        if (!movingTowardPaddle || !isBallOverlappingPaddle(paddle)) {
            return false;
        }

        const currentSpeed = Math.hypot(ball.vx, ball.vy);
        const nextSpeed = clamp(currentSpeed + 0.3, CONFIG.initialBallSpeed, CONFIG.maxBallSpeed);
        const paddleCenter = paddle.y + paddle.height / 2;
        const collisionPercent = clamp((ball.y - paddleCenter) / (paddle.height / 2), -1, 1);
        const angle = collisionPercent * (Math.PI / 4);
        const direction = isPlayer ? 1 : -1;

        let nextVx = direction * Math.max(
            CONFIG.minHorizontalBallSpeed,
            Math.abs(nextSpeed * Math.cos(angle))
        );
        let nextVy = nextSpeed * Math.sin(angle);
        const resultingSpeed = Math.hypot(nextVx, nextVy);

        if (resultingSpeed > CONFIG.maxBallSpeed) {
            const scale = CONFIG.maxBallSpeed / resultingSpeed;
            nextVx *= scale;
            nextVy *= scale;
        }

        ball.vx = nextVx;
        ball.vy = nextVy;
        ball.x = isPlayer
            ? paddle.x + paddle.width + ball.size
            : paddle.x - ball.size;

        return true;
    }

    function checkBoundaries() {
        if (ball.x + ball.size < 0) {
            awardPoint('ai');
        } else if (ball.x - ball.size > CONFIG.canvasWidth) {
            awardPoint('player');
        }
    }

    function updateWorld(deltaMs) {
        if (game.state !== GAME_STATES.PLAYING) {
            return;
        }

        const frameScale = deltaMs / (1000 / 60);
        updatePlayerPaddle(frameScale);
        aiPaddle.update(frameScale);
        ball.update(frameScale);
        checkPaddleCollision(playerPaddle, 'player');
        checkPaddleCollision(aiPaddle, 'ai');
        checkBoundaries();
    }

    function drawField() {
        ctx.fillStyle = '#0a0e27';
        ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.setLineDash([10, 10]);
        ctx.lineWidth = CONFIG.centerLineWidth;
        ctx.beginPath();
        ctx.moveTo(CONFIG.canvasWidth / 2, 0);
        ctx.lineTo(CONFIG.canvasWidth / 2, CONFIG.canvasHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

        playerPaddle.draw();
        aiPaddle.draw();
        ball.draw();
    }

    function gameLoop(timestamp) {
        if (game.lastTimestamp === null) {
            game.lastTimestamp = timestamp;
        }

        const deltaMs = clamp(timestamp - game.lastTimestamp, 0, CONFIG.maxFrameDeltaMs);
        game.lastTimestamp = timestamp;

        if (game.state === GAME_STATES.COUNTDOWN) {
            updateCountdown(deltaMs);
        } else if (game.state === GAME_STATES.PLAYING) {
            updateWorld(deltaMs);
        }

        drawField();
        game.animationFrameId = window.requestAnimationFrame(gameLoop);
    }

    function updateInterface() {
        elements.menuOverlay.hidden = game.state !== GAME_STATES.MENU;
        elements.pauseOverlay.hidden = game.state !== GAME_STATES.PAUSED;
        elements.gameOverOverlay.hidden = game.state !== GAME_STATES.GAME_OVER;
        elements.countdown.hidden = game.state !== GAME_STATES.COUNTDOWN;
        elements.stateBadge.textContent = stateLabels[game.state];
        elements.stateBadge.hidden = game.state === GAME_STATES.MENU
            || game.state === GAME_STATES.PAUSED
            || game.state === GAME_STATES.GAME_OVER;

        const canPause = game.state === GAME_STATES.PLAYING || game.state === GAME_STATES.COUNTDOWN;
        elements.pauseButton.disabled = !(canPause || game.state === GAME_STATES.PAUSED);
        elements.pauseButton.textContent = game.state === GAME_STATES.PAUSED ? 'Продолжить' : 'Пауза';

        if (game.state === GAME_STATES.COUNTDOWN) {
            elements.countdown.textContent = String(Math.max(1, Math.ceil(game.countdownRemainingMs / 1000)));
        }

        if (game.state === GAME_STATES.GAME_OVER) {
            elements.resultTitle.textContent = game.winner === 'player' ? 'Вы победили!' : 'Победил компьютер';
            elements.resultScore.textContent = `Финальный счёт: ${game.playerScore}:${game.aiScore}`;
        }
    }

    function setPointerFromClientY(clientY) {
        const rect = canvas.getBoundingClientRect();
        if (rect.height <= 0) {
            return;
        }

        const logicalY = (clientY - rect.top) * (CONFIG.canvasHeight / rect.height);
        game.pointerY = clamp(logicalY, 0, CONFIG.canvasHeight);
        game.inputMode = INPUT_MODES.POINTER;
    }

    function gameHasFocus() {
        const activeElement = document.activeElement;
        return activeElement === canvas || Boolean(activeElement && activeElement.closest?.('.game-area'));
    }

    function handleKeyDown(event) {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            keys[event.key] = true;
            game.inputMode = INPUT_MODES.KEYBOARD;

            if (gameHasFocus()) {
                event.preventDefault();
            }
            return;
        }

        if (event.key === 'Escape') {
            if (game.state === GAME_STATES.PLAYING
                || game.state === GAME_STATES.COUNTDOWN
                || game.state === GAME_STATES.PAUSED) {
                event.preventDefault();
                togglePause();
            }
            return;
        }

        if (event.key.toLowerCase() === 'r') {
            event.preventDefault();
            restartMatch();
        }
    }

    function handleKeyUp(event) {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            keys[event.key] = false;
        }
    }

    function handlePointerMove(event) {
        setPointerFromClientY(event.clientY);
    }

    function handlePointerDown(event) {
        setPointerFromClientY(event.clientY);
        canvas.focus({ preventScroll: true });
    }

    function handleAutomaticPause() {
        clearPressedKeys();
        pauseGame();
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            handleAutomaticPause();
        }
    }

    function registerEventListeners() {
        window.addEventListener('keydown', handleKeyDown, { passive: false });
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleAutomaticPause);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerdown', handlePointerDown);

        elements.startButton.addEventListener('click', startMatch);
        elements.pauseButton.addEventListener('click', togglePause);
        elements.restartButton.addEventListener('click', restartMatch);
        elements.resumeButton.addEventListener('click', resumeGame);
        elements.pauseRestartButton.addEventListener('click', restartMatch);
        elements.pauseMenuButton.addEventListener('click', returnToMenu);
        elements.replayButton.addEventListener('click', restartMatch);
        elements.gameOverMenuButton.addEventListener('click', returnToMenu);
    }

    function getSnapshot() {
        return {
            state: game.state,
            playerScore: game.playerScore,
            aiScore: game.aiScore,
            winner: game.winner,
            inputMode: game.inputMode,
            winningScore: CONFIG.winningScore
        };
    }

    function initialize() {
        resetPositions();
        updateScore();
        updateInterface();
        drawField();
        registerEventListeners();
        game.animationFrameId = window.requestAnimationFrame(gameLoop);
    }

    const publicApi = {
        states: GAME_STATES,
        getSnapshot,
        start: startMatch,
        restart: restartMatch,
        pause: pauseGame,
        resume: resumeGame,
        menu: returnToMenu
    };

    if (window.__PONC_TEST__) {
        publicApi.__test = {
            CONFIG,
            INPUT_MODES,
            game,
            keys,
            ball,
            playerPaddle,
            aiPaddle,
            setState,
            beginCountdown,
            awardPoint,
            updateCountdown,
            updatePlayerPaddle,
            updateWorld,
            checkPaddleCollision,
            checkBoundaries,
            setPointerFromClientY,
            handleAutomaticPause,
            handleVisibilityChange,
            clearPressedKeys
        };
    }

    window.PoncGame = Object.freeze(publicApi);
    initialize();
})();
