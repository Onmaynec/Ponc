'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const gameSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8');

function createEventTarget(initial = {}) {
    const listeners = new Map();
    return {
        hidden: false,
        disabled: false,
        textContent: '',
        ...initial,
        addEventListener(type, handler) {
            if (!listeners.has(type)) {
                listeners.set(type, []);
            }
            listeners.get(type).push(handler);
        },
        dispatch(type, event = {}) {
            for (const handler of listeners.get(type) ?? []) {
                handler(event);
            }
        },
        closest() {
            return null;
        }
    };
}

function createCanvasContext() {
    const gradient = { addColorStop() {} };
    return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        shadowColor: '',
        shadowBlur: 0,
        createRadialGradient() { return gradient; },
        fillRect() {},
        strokeRect() {},
        beginPath() {},
        arc() {},
        fill() {},
        stroke() {},
        setLineDash() {},
        moveTo() {},
        lineTo() {}
    };
}

function createHarness() {
    const elements = new Map();
    const ids = [
        'playerScore', 'aiScore', 'menuOverlay', 'pauseOverlay', 'gameOverOverlay',
        'countdown', 'stateBadge', 'resultTitle', 'resultScore', 'startButton',
        'pauseButton', 'restartButton', 'resumeButton', 'pauseRestartButton',
        'pauseMenuButton', 'replayButton', 'gameOverMenuButton'
    ];

    for (const id of ids) {
        elements.set(id, createEventTarget());
    }

    const canvas = createEventTarget({
        width: 800,
        height: 400,
        rect: { top: 0, left: 0, width: 800, height: 400 },
        getContext() { return createCanvasContext(); },
        getBoundingClientRect() { return this.rect; },
        focus() { document.activeElement = this; }
    });
    elements.set('gameCanvas', canvas);

    const document = createEventTarget({
        activeElement: canvas,
        getElementById(id) { return elements.get(id) ?? null; }
    });

    const window = createEventTarget({
        __PONC_TEST__: true,
        requestAnimationFrame(callback) {
            this.lastAnimationFrame = callback;
            return 1;
        }
    });

    window.window = window;
    window.document = document;

    const context = vm.createContext({
        window,
        document,
        console,
        Math,
        Object,
        Number,
        String,
        Boolean,
        Error
    });

    vm.runInContext(gameSource, context, { filename: 'game.js' });

    return {
        api: window.PoncGame,
        testApi: window.PoncGame.__test,
        window,
        document,
        canvas,
        elements
    };
}

test('initializes in MENU and starts with COUNTDOWN', () => {
    const { api } = createHarness();

    assert.equal(api.getSnapshot().state, api.states.MENU);
    api.start();
    assert.equal(api.getSnapshot().state, api.states.COUNTDOWN);
});

test('physics becomes active only after countdown', () => {
    const { api, testApi } = createHarness();

    api.start();
    const initialX = testApi.ball.x;
    testApi.updateWorld(16.67);
    assert.equal(testApi.ball.x, initialX);

    testApi.updateCountdown(testApi.CONFIG.countdownDurationMs);
    assert.equal(api.getSnapshot().state, api.states.PLAYING);
    testApi.updateWorld(16.67);
    assert.notEqual(testApi.ball.x, initialX);
});

test('finishes exactly at winningScore and freezes later scoring', () => {
    const { api, testApi } = createHarness();

    testApi.setState(api.states.PLAYING);
    testApi.game.playerScore = testApi.CONFIG.winningScore - 1;
    testApi.awardPoint('player');

    assert.equal(testApi.game.playerScore, testApi.CONFIG.winningScore);
    assert.equal(api.getSnapshot().state, api.states.GAME_OVER);
    assert.equal(api.getSnapshot().winner, 'player');

    assert.equal(testApi.awardPoint('ai'), false);
    assert.equal(testApi.game.aiScore, 0);
});


test('supports AI victory at 0:11', () => {
    const { api, testApi } = createHarness();

    testApi.setState(api.states.PLAYING);
    testApi.game.aiScore = testApi.CONFIG.winningScore - 1;
    testApi.awardPoint('ai');

    assert.equal(testApi.game.playerScore, 0);
    assert.equal(testApi.game.aiScore, testApi.CONFIG.winningScore);
    assert.equal(api.getSnapshot().state, api.states.GAME_OVER);
    assert.equal(api.getSnapshot().winner, 'ai');
});
test('maps pointer coordinates at Canvas widths 800, 600, 400 and 320 px', () => {
    for (const width of [800, 600, 400, 320]) {
        const { testApi, canvas } = createHarness();
        const height = width / 2;
        canvas.rect = { top: 20, left: 0, width, height };
        testApi.setPointerFromClientY(20 + height / 2);
        testApi.updatePlayerPaddle(1);

        assert.equal(testApi.game.pointerY, 200, `width ${width}`);
        assert.equal(
            testApi.playerPaddle.y + testApi.playerPaddle.height / 2,
            200,
            `width ${width}`
        );
    }
});

test('last input mode wins between keyboard and pointer', () => {
    const { testApi, canvas } = createHarness();

    testApi.game.inputMode = testApi.INPUT_MODES.KEYBOARD;
    testApi.keys.ArrowDown = true;
    const startY = testApi.playerPaddle.y;
    testApi.updatePlayerPaddle(1);
    assert.ok(testApi.playerPaddle.y > startY);

    canvas.rect = { top: 0, left: 0, width: 800, height: 400 };
    testApi.setPointerFromClientY(80);
    testApi.updatePlayerPaddle(1);
    assert.equal(testApi.game.inputMode, testApi.INPUT_MODES.POINTER);
    assert.equal(testApi.playerPaddle.y + testApi.playerPaddle.height / 2, 80);
});

test('paddle collision fires only toward paddle and ejects ball', () => {
    const { testApi } = createHarness();
    const paddle = testApi.playerPaddle;

    testApi.ball.x = paddle.x + paddle.width;
    testApi.ball.y = paddle.y + paddle.height / 2;
    testApi.ball.vx = -5;
    testApi.ball.vy = 0;

    assert.equal(testApi.checkPaddleCollision(paddle, 'player'), true);
    assert.ok(testApi.ball.vx > 0);
    assert.equal(testApi.ball.x, paddle.x + paddle.width + testApi.ball.size);
    assert.equal(testApi.checkPaddleCollision(paddle, 'player'), false);
});

test('collision caps speed and preserves minimum horizontal velocity', () => {
    const { testApi } = createHarness();
    const paddle = testApi.playerPaddle;

    testApi.ball.x = paddle.x + paddle.width;
    testApi.ball.y = paddle.y;
    testApi.ball.vx = -30;
    testApi.ball.vy = -30;

    testApi.checkPaddleCollision(paddle, 'player');

    assert.ok(Math.hypot(testApi.ball.vx, testApi.ball.vy) <= testApi.CONFIG.maxBallSpeed + 1e-9);
    assert.ok(Math.abs(testApi.ball.vx) >= testApi.CONFIG.minHorizontalBallSpeed);
});

test('automatic pause preserves countdown and playing resume target', () => {
    const { api, testApi } = createHarness();

    testApi.setState(api.states.COUNTDOWN);
    assert.equal(testApi.handleAutomaticPause(), undefined);
    assert.equal(api.getSnapshot().state, api.states.PAUSED);
    api.resume();
    assert.equal(api.getSnapshot().state, api.states.COUNTDOWN);

    testApi.setState(api.states.PLAYING);
    testApi.handleAutomaticPause();
    assert.equal(api.getSnapshot().state, api.states.PAUSED);
    api.resume();
    assert.equal(api.getSnapshot().state, api.states.PLAYING);
});
