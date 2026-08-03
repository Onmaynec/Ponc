import { DEFAULT_AI_DIFFICULTY, normalizeAIDifficulty } from './config/aiDifficulty.js';
import { GAME_CONFIG } from './config/gameConfig.js';
import { GameCore } from './core/GameCore.js';
import { GameLoop } from './core/GameLoop.js';
import { CanvasRenderer } from './rendering/CanvasRenderer.js';
import { InputSystem } from './systems/InputSystem.js';
import { GameUI } from './ui/GameUI.js';

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '1.1.0';
const AI_DIFFICULTY_STORAGE_KEY = 'ponc.aiDifficulty';

function loadAIDifficulty() {
  try {
    return normalizeAIDifficulty(window.localStorage.getItem(AI_DIFFICULTY_STORAGE_KEY));
  } catch {
    return DEFAULT_AI_DIFFICULTY;
  }
}

function saveAIDifficulty(difficulty) {
  try {
    window.localStorage.setItem(AI_DIFFICULTY_STORAGE_KEY, difficulty);
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
}

function bootstrap() {
  const canvas = document.getElementById('gameCanvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Game canvas is unavailable.');
  }

  const core = new GameCore({ aiDifficulty: loadAIDifficulty() });
  const renderer = new CanvasRenderer(canvas, GAME_CONFIG);
  const ui = new GameUI();
  const input = new InputSystem({
    canvas,
    fieldHeight: GAME_CONFIG.field.height,
    callbacks: {
      onTogglePause: () => core.togglePause(),
      onRestart: () => core.restartMatch(),
      onAutomaticPause: () => core.pause(),
    },
  });

  const actions = {
    start: () => {
      core.startMatch();
      canvas.focus({ preventScroll: true });
    },
    restart: () => {
      input.reset();
      core.restartMatch();
      canvas.focus({ preventScroll: true });
    },
    togglePause: () => core.togglePause(),
    resume: () => {
      core.resume();
      canvas.focus({ preventScroll: true });
    },
    menu: () => {
      input.reset();
      core.returnToMenu();
    },
    setAIDifficulty: (difficulty) => {
      const selectedDifficulty = core.setAIDifficulty(difficulty);
      if (selectedDifficulty) saveAIDifficulty(selectedDifficulty);
    },
  };

  ui.bind(actions);
  input.attach();
  ui.setVersion(APP_VERSION);

  const loop = new GameLoop({
    config: GAME_CONFIG,
    update: (deltaSeconds) => core.step(deltaSeconds, input.getCommand()),
    render: () => {
      const snapshot = core.getSnapshot();
      renderer.render(snapshot);
      ui.render(snapshot);
    },
  });
  loop.start();
}

try {
  bootstrap();
} catch (error) {
  try {
    new GameUI().showFatalError(error);
  } catch {
    console.error('Ponc initialization failed before UI recovery:', error);
    document.body.textContent = 'Ponc не удалось запустить.';
  }
}
