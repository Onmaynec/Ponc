import { GAME_CONFIG } from './config/gameConfig.js';
import { GameCore } from './core/GameCore.js';
import { GameLoop } from './core/GameLoop.js';
import { CanvasRenderer } from './rendering/CanvasRenderer.js';
import { InputSystem } from './systems/InputSystem.js';
import { GameUI } from './ui/GameUI.js';

const APP_VERSION =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '1.1.0';

function bootstrap() {
  const canvas = document.getElementById('gameCanvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Game canvas is unavailable.');
  }

  const core = new GameCore();
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
