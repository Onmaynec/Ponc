import { GAME_STATES } from '../core/constants.js';
import { normalizeSettings, GAME_MODES } from '../core/MatchSettings.js';
import { summarizeHistory } from '../core/MatchHistory.js';

const STATE_LABELS = Object.freeze({
  [GAME_STATES.MENU]: 'Меню',
  [GAME_STATES.COUNTDOWN]: 'Подача',
  [GAME_STATES.PLAYING]: 'Игра',
  [GAME_STATES.PAUSED]: 'Пауза',
  [GAME_STATES.GAME_OVER]: 'Матч завершён',
});

export class GameUI {
  constructor(root = document) {
    this.root = root;
    this.elements = this.collectElements();
    this.cleanup = [];
  }

  collectElements() {
    const ids = [
      'playerScore',
      'aiScore',
      'menuOverlay',
      'pauseOverlay',
      'gameOverOverlay',
      'countdown',
      'stateBadge',
      'resultTitle',
      'resultScore',
      'startButton',
      'pauseButton',
      'restartButton',
      'resumeButton',
      'pauseRestartButton',
      'pauseMenuButton',
      'replayButton',
      'gameOverMenuButton',
      'fatalError',
      'modeSelect',
      'difficultySelect',
      'winningScoreSelect',
      'difficultyField',
      'aiLabel',
      'rallyValue',
      'bestRallyValue',
      'careerGames',
      'careerWins',
      'careerRate',
      'modeHint',
    ];
    const elements = Object.fromEntries(
      ids.map((id) => [id, this.root.getElementById(id)]),
    );
    const missing = ids.filter((id) => !elements[id]);
    if (missing.length > 0)
      throw new Error(`Missing required UI elements: ${missing.join(', ')}`);
    return elements;
  }

  bind(actions) {
    const bindings = [
      ['startButton', actions.start],
      ['pauseButton', actions.togglePause],
      ['restartButton', actions.restart],
      ['resumeButton', actions.resume],
      ['pauseRestartButton', actions.restart],
      ['pauseMenuButton', actions.menu],
      ['replayButton', actions.restart],
      ['gameOverMenuButton', actions.menu],
    ];
    for (const [elementName, handler] of bindings) {
      const element = this.elements[elementName];
      element.addEventListener('click', handler);
      this.cleanup.push(() => element.removeEventListener('click', handler));
    }
    const modeChanged = () => this.updateModeHint();
    this.elements.modeSelect.addEventListener('change', modeChanged);
    this.cleanup.push(() =>
      this.elements.modeSelect.removeEventListener('change', modeChanged),
    );
    this.updateModeHint();
  }

  getSettings() {
    return normalizeSettings({
      mode: this.elements.modeSelect.value,
      difficulty: this.elements.difficultySelect.value,
      winningScore: Number(this.elements.winningScoreSelect.value),
    });
  }

  updateModeHint() {
    const local = this.elements.modeSelect.value === GAME_MODES.LOCAL;
    this.elements.difficultyField.hidden = local;
    this.elements.modeHint.textContent = local
      ? 'Игрок 1: W / S · Игрок 2: ↑ / ↓ · игра вдвоём за одной клавиатурой.'
      : 'Вы управляете левой ракеткой мышью или стрелками. Справа — компьютер.';
  }

  setHistory(history) {
    const stats = summarizeHistory(history);
    this.elements.careerGames.textContent = String(stats.games);
    this.elements.careerWins.textContent = String(stats.wins);
    this.elements.careerRate.textContent = `${stats.winRate}%`;
  }

  destroy() {
    for (const dispose of this.cleanup.splice(0)) dispose();
  }

  render(snapshot) {
    const elements = this.elements;
    elements.playerScore.textContent = String(snapshot.score.player);
    elements.aiScore.textContent = String(snapshot.score.ai);
    elements.aiLabel.textContent =
      snapshot.settings.mode === GAME_MODES.LOCAL ? 'Игрок 2' : 'Компьютер';
    elements.rallyValue.textContent = String(snapshot.rallyHits);
    elements.bestRallyValue.textContent = String(snapshot.bestRally);
    elements.menuOverlay.hidden = snapshot.state !== GAME_STATES.MENU;
    elements.pauseOverlay.hidden = snapshot.state !== GAME_STATES.PAUSED;
    elements.gameOverOverlay.hidden = snapshot.state !== GAME_STATES.GAME_OVER;
    elements.countdown.hidden = snapshot.state !== GAME_STATES.COUNTDOWN;
    elements.stateBadge.textContent = STATE_LABELS[snapshot.state];
    elements.stateBadge.hidden = [
      GAME_STATES.MENU,
      GAME_STATES.PAUSED,
      GAME_STATES.GAME_OVER,
    ].includes(snapshot.state);
    const canPause = [GAME_STATES.PLAYING, GAME_STATES.COUNTDOWN].includes(
      snapshot.state,
    );
    elements.pauseButton.disabled = !canPause && snapshot.state !== GAME_STATES.PAUSED;
    elements.pauseButton.textContent =
      snapshot.state === GAME_STATES.PAUSED ? 'Продолжить' : 'Пауза';
    if (snapshot.state === GAME_STATES.COUNTDOWN) {
      elements.countdown.textContent = String(
        Math.max(1, Math.ceil(snapshot.countdownRemainingSeconds)),
      );
    }
    if (snapshot.state === GAME_STATES.GAME_OVER) {
      const playerWon = snapshot.winner === 'player';
      elements.resultTitle.textContent =
        snapshot.settings.mode === GAME_MODES.LOCAL
          ? `Победил игрок ${playerWon ? '1' : '2'}!`
          : playerWon
            ? 'Вы победили!'
            : 'Победил компьютер';
      elements.resultScore.textContent = `Финальный счёт: ${snapshot.score.player}:${snapshot.score.ai}. Лучшая серия: ${snapshot.bestRally}`;
    }
    document.documentElement.dataset.gameState = snapshot.state;
  }

  setVersion(version) {
    for (const element of this.root.querySelectorAll('[data-app-version]'))
      element.textContent = version;
    document.documentElement.dataset.appVersion = version;
  }

  showFatalError(error) {
    this.elements.fatalError.hidden = false;
    this.elements.fatalError.textContent =
      'Не удалось запустить Ponc. Обновите страницу или проверьте консоль разработчика.';
    console.error('Ponc initialization failed:', error);
  }
}
