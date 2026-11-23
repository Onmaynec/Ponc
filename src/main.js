import { GAME_CONFIG } from './config/gameConfig.js';
import { GameCore } from './core/GameCore.js';
import { GAME_EVENTS } from './core/constants.js';
import { GameLoop } from './core/GameLoop.js';
import { readMatchHistory, saveMatchResult } from './core/MatchHistory.js';
import { readSurvivalRecords, saveSurvivalRecord } from './core/SurvivalRecords.js';
import { readCircuitRecords, saveCircuitResult } from './core/CircuitRecords.js';
import { readTrainingRecords, saveTrainingRecord } from './core/TrainingRecords.js';
import { CanvasRenderer } from './rendering/CanvasRenderer.js';
import { InputSystem } from './systems/InputSystem.js';
import { GameUI } from './ui/GameUI.js';
import { SoundSystem } from './systems/SoundSystem.js';

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '1.8.0';

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
  ui.setSurvivalRecords(readSurvivalRecords(storage));
  ui.setCircuitRecords(readCircuitRecords(storage));
  ui.setTrainingRecords(readTrainingRecords(storage));
  ui.bindPreferences(
    {
      sound: (enabled) => sound.setEnabled(enabled),
      palette: (palette) => renderer.setPalette(palette),
    },
    storage,
  );
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
  ui.bindMatchPresets(storage);
  core.events.on(GAME_EVENTS.SERVE_ACTIVE, () => sound.play('serve'));
  core.events.on(GAME_EVENTS.ARENA_BOUNCE, () => sound.play('bumper'));
  core.events.on(GAME_EVENTS.ARENA_PORTAL, () => sound.play('portal'));
  core.events.on(GAME_EVENTS.TRAINING_SCORE, (reward) => {
    if (reward.kind === 'precision' && reward.accurate) sound.play('precision');
    if (reward.kind === 'rally') sound.play('combo');
    ui.showTrainingReward(reward);
  });
  core.events.on(GAME_EVENTS.CIRCUIT_ROUND, (stage) => {
    sound.play('round');
    ui.showCircuitRound(stage);
  });
  core.events.on(GAME_EVENTS.POWER_UP_COLLECTED, (payload) => {
    sound.play('power');
    ui.showPowerUp(payload);
  });
  core.events.on(GAME_EVENTS.POWER_UP_SHIELD, (payload) => {
    sound.play('shield');
    ui.showPowerUp({ ...payload, shield: true });
  });
  core.events.on(GAME_EVENTS.GOAL, ({ side }) =>
    sound.play(side === 'player' ? 'goal' : 'lose'),
  );
  core.events.on(GAME_EVENTS.GAME_OVER, (snapshot) => {
    sound.play(snapshot.winner === 'player' ? 'win' : 'lose');
    ui.setHistory(saveMatchResult(storage, snapshot));
    ui.setSurvivalRecords(saveSurvivalRecord(storage, snapshot));
    ui.setCircuitRecords(saveCircuitResult(storage, snapshot));
    ui.setTrainingRecords(saveTrainingRecord(storage, snapshot));
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
