import { GAME_CONFIG } from './config/gameConfig.js';
import { GameCore } from './core/GameCore.js';
import { GAME_EVENTS } from './core/constants.js';
import { GameLoop } from './core/GameLoop.js';
import { readMatchHistory, saveMatchResult } from './core/MatchHistory.js';
import { CanvasRenderer } from './rendering/CanvasRenderer.js';
import { InputSystem } from './systems/InputSystem.js';
import { GameUI } from './ui/GameUI.js';
import { SoundSystem } from './systems/SoundSystem.js';

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '1.3.0';

function bootstrap() {
  const canvas = document.getElementById('gameCanvas');
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error('Game canvas is unavailable.');
  const core = new GameCore();
  const renderer = new CanvasRenderer(canvas, GAME_CONFIG);
  const ui = new GameUI();
  const sound = new SoundSystem();
  let previousRallyHits = 0;
  let storage = null;
  try {
    storage = window.localStorage;
  } catch {
    /* storage blocked */
  }
  ui.setHistory(readMatchHistory(storage));
  ui.bindPreferences({
    sound: (enabled) => sound.setEnabled(enabled),
    palette: (palette) => renderer.setPalette(palette),
  }, storage);
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
      sound.unlock();
      core.configure(ui.getSettings());
      input.reset();
      core.startMatch();
      canvas.focus({ preventScroll: true });
    },
    restart: () => {
      sound.unlock();
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
  core.events.on(GAME_EVENTS.SERVE_ACTIVE, () => sound.play('serve'));
  core.events.on(GAME_EVENTS.GOAL, ({ side }) => sound.play(side === 'player' ? 'goal' : 'lose'));
  core.events.on(GAME_EVENTS.GAME_OVER, (snapshot) => {
    sound.play(snapshot.winner === 'player' ? 'win' : 'lose');
    ui.setHistory(saveMatchResult(storage, snapshot));
  });
  input.attach();
  ui.setVersion(APP_VERSION);
  const loop = new GameLoop({
    config: GAME_CONFIG,
    update: (deltaSeconds) =>
      core.step(
        deltaSeconds,
        input.getCommand(core.settings.mode),
        input.getSecondPlayerCommand(),
      ),
    render: () => {
      const snapshot = core.getSnapshot();
      if (snapshot.rallyHits > previousRallyHits) sound.play('paddle');
      previousRallyHits = snapshot.rallyHits;
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
