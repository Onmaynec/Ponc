import { ACHIEVEMENTS, unlockedAchievements } from '../core/Achievements.js';
import { GAME_STATES } from '../core/constants.js';
import { normalizeSettings, GAME_MODES, RULESETS } from '../core/MatchSettings.js';
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
    this.alertTimeout = null;
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
      'powerUpsSelect',
      'powerUpInfo',
      'powerUpCounter',
      'powerUpAlert',
      'rulesetSelect',
      'winningScoreField',
      'matchClock',
      'matchRuleLabel',
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
      'soundToggle',
      'paletteSelect',
      'achievementsList',
      'achievementCount',
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
    this.elements.powerUpsSelect.addEventListener('change', modeChanged);
    this.cleanup.push(() =>
      this.elements.powerUpsSelect.removeEventListener('change', modeChanged),
    );
    this.elements.rulesetSelect.addEventListener('change', modeChanged);
    this.cleanup.push(() =>
      this.elements.rulesetSelect.removeEventListener('change', modeChanged),
    );
    this.updateModeHint();
  }

  bindPreferences(callbacks, storage) {
    const soundToggle = this.elements.soundToggle;
    const paletteSelect = this.elements.paletteSelect;
    let saved = {};
    try {
      saved = JSON.parse(storage?.getItem('ponc:preferences:v1') || '{}') || {};
    } catch {
      saved = {};
    }
    soundToggle.checked = saved.sound !== false;
    paletteSelect.value = ['neon', 'retro', 'mono'].includes(saved.palette)
      ? saved.palette
      : 'neon';
    const apply = () => {
      callbacks.sound(soundToggle.checked);
      callbacks.palette(paletteSelect.value);
      try {
        storage?.setItem(
          'ponc:preferences:v1',
          JSON.stringify({ sound: soundToggle.checked, palette: paletteSelect.value }),
        );
      } catch {
        /* optional */
      }
    };
    soundToggle.addEventListener('change', apply);
    paletteSelect.addEventListener('change', apply);
    this.cleanup.push(() => soundToggle.removeEventListener('change', apply));
    this.cleanup.push(() => paletteSelect.removeEventListener('change', apply));
    apply();
  }

  getSettings() {
    return normalizeSettings({
      mode: this.elements.modeSelect.value,
      ruleset: this.elements.rulesetSelect.value,
      powerUps: this.elements.powerUpsSelect.value === 'on',
      difficulty: this.elements.difficultySelect.value,
      winningScore: Number(this.elements.winningScoreSelect.value),
    });
  }

  updateModeHint() {
    const local = this.elements.modeSelect.value === GAME_MODES.LOCAL;
    this.elements.difficultyField.hidden = local;
    const ruleset = this.elements.rulesetSelect.value;
    this.elements.winningScoreField.hidden = ruleset !== RULESETS.CLASSIC;
    const controls = local
      ? 'Игрок 1: W / S · Игрок 2: ↑ / ↓. На телефоне — два касания по сторонам поля.'
      : 'Вы управляете левой ракеткой мышью или стрелками. Справа — компьютер.';
    const rules = {
      [RULESETS.CLASSIC]: 'Побеждает первый, кто наберёт выбранное количество очков.',
      [RULESETS.SUDDEN_DEATH]: 'Первое очко решает весь матч.',
      [RULESETS.TIME_ATTACK]: '90 секунд активной игры. При ничьей — решающее очко.',
    };
    const extras = this.elements.powerUpsSelect.value === 'on'
      ? ' Усиления: ловите шаром капсулы, чтобы получить бонус.'
      : '';
    this.elements.modeHint.textContent = `${controls} ${rules[ruleset]}${extras}`;
  }

  setHistory(history) {
    const stats = summarizeHistory(history);
    this.elements.careerGames.textContent = String(stats.games);
    this.elements.careerWins.textContent = String(stats.wins);
    this.elements.careerRate.textContent = `${stats.winRate}%`;
    const unlocked = unlockedAchievements(history);
    this.elements.achievementCount.textContent = `${unlocked.filter((item) => item.unlocked).length}/${ACHIEVEMENTS.length}`;
    this.elements.achievementsList.replaceChildren(
      ...unlocked.map((item) => {
        const li = this.root.createElement('li');
        li.className = item.unlocked ? 'achievement earned' : 'achievement';
        li.textContent = `${item.unlocked ? '✓' : '○'} ${item.title} — ${item.description}`;
        return li;
      }),
    );
  }

  showPowerUp({ type, side, shield = false }) {
    const names = { expand: 'РАКЕТКА XL', turbo: 'ТУРБО', shield: 'ЭНЕРГОЩИТ' };
    const playerName = side === 'player' ? 'Игрок 1' : 'Игрок 2 / ИИ';
    this.elements.powerUpAlert.textContent = shield
      ? `${playerName} отразил удар щитом!`
      : `${playerName}: ${names[type] ?? 'БОНУС'}!`;
    this.elements.powerUpAlert.hidden = false;
    if (this.alertTimeout !== null) clearTimeout(this.alertTimeout);
    this.alertTimeout = setTimeout(() => {
      this.elements.powerUpAlert.hidden = true;
      this.alertTimeout = null;
    }, 1800);
  }

  destroy() {
    if (this.alertTimeout !== null) clearTimeout(this.alertTimeout);
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
    elements.powerUpInfo.hidden = !snapshot.powerUps.enabled;
    elements.powerUpCounter.hidden = !snapshot.powerUps.enabled;
    if (snapshot.powerUps.enabled) {
      const buffs = [];
      for (const side of ['player', 'ai']) {
        const label = side === 'player' ? 'P1' : 'P2';
        if (snapshot.powerUps.expand[side] > 0)
          buffs.push(`${label} XL ${Math.ceil(snapshot.powerUps.expand[side])}с`);
        if (snapshot.powerUps.shield[side] > 0)
          buffs.push(`${label} ЩИТ ${Math.ceil(snapshot.powerUps.shield[side])}с`);
      }
      elements.powerUpInfo.textContent = buffs.length
        ? buffs.join(' · ')
        : 'Собирайте капсулы мячом';
      elements.powerUpCounter.textContent = String(
        snapshot.powerUps.collected.player + snapshot.powerUps.collected.ai,
      );
    }
    elements.matchRuleLabel.textContent = {
      [RULESETS.CLASSIC]: 'КЛАССИКА',
      [RULESETS.SUDDEN_DEATH]: 'РЕШАЮЩЕЕ ОЧКО',
      [RULESETS.TIME_ATTACK]: 'НА ВРЕМЯ',
    }[snapshot.settings.ruleset];
    elements.matchClock.hidden = snapshot.settings.ruleset !== RULESETS.TIME_ATTACK;
    elements.matchClock.textContent = snapshot.overtime
      ? 'ОВЕРТАЙМ'
      : `ОСТАЛОСЬ ${Math.ceil(snapshot.remainingSeconds)} С`;
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
    document.documentElement.dataset.powerUps = String(snapshot.powerUps.enabled);
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
