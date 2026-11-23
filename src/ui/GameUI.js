import { ACHIEVEMENTS, unlockedAchievements } from '../core/Achievements.js';
import { GAME_STATES } from '../core/constants.js';
import { normalizeSettings, GAME_MODES, RULESETS } from '../core/MatchSettings.js';
import { summarizeHistory } from '../core/MatchHistory.js';
import { summarizeSurvival } from '../core/SurvivalRecords.js';
import { summarizeCircuit } from '../core/CircuitRecords.js';
import { summarizeTraining } from '../core/TrainingRecords.js';
import { DRILL_PROFILES } from '../core/TrainingSystem.js';
import { ARENAS } from '../systems/ArenaSystem.js';

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
      'modeField',
      'arenaField',
      'powerUpsField',
      'trainingDrillField',
      'trainingDrillSelect',
      'trainingMetric',
      'trainingPoints',
      'trainingClock',
      'trainingDetails',
      'trainingPrecisionBest',
      'trainingRallyBest',
      'trainingReflexBest',
      'trainingAttempts',
      'trainingHistory',
      'powerUpsSelect',
      'arenaSelect',
      'arenaMetric',
      'circuitMetric',
      'circuitStage',
      'circuitRoute',
      'circuitBest',
      'circuitTrophies',
      'circuitAttempts',
      'circuitHistory',
      'survivalMetric',
      'survivalLives',
      'survivalBest',
      'survivalRuns',
      'survivalLeaderboard',
      'recentMatchesList',
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
    this.elements.arenaSelect.addEventListener('change', modeChanged);
    this.cleanup.push(() =>
      this.elements.arenaSelect.removeEventListener('change', modeChanged),
    );
    this.elements.powerUpsSelect.addEventListener('change', modeChanged);
    this.cleanup.push(() =>
      this.elements.powerUpsSelect.removeEventListener('change', modeChanged),
    );
    this.elements.trainingDrillSelect.addEventListener('change', modeChanged);
    this.cleanup.push(() => this.elements.trainingDrillSelect.removeEventListener('change', modeChanged));
    this.elements.rulesetSelect.addEventListener('change', modeChanged);
    this.cleanup.push(() =>
      this.elements.rulesetSelect.removeEventListener('change', modeChanged),
    );
    this.updateModeHint();
  }

  bindMatchPresets(storage) {
    const names = [
      'modeSelect',
      'difficultySelect',
      'rulesetSelect',
      'winningScoreSelect',
      'powerUpsSelect',
      'arenaSelect',
      'trainingDrillSelect',
    ];
    try {
      const saved = JSON.parse(storage?.getItem('ponc:match-presets:v1') || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        for (const name of names) {
          const value = saved[name];
          const select = this.elements[name];
          if (
            typeof value === 'string' &&
            [...select.options].some((option) => option.value === value)
          )
            select.value = value;
        }
      }
    } catch {
      // Corrupt or unavailable storage should not prevent the game from starting.
    }
    const persist = () => {
      try {
        const settings = Object.fromEntries(
          names.map((name) => [name, this.elements[name].value]),
        );
        storage?.setItem('ponc:match-presets:v1', JSON.stringify(settings));
      } catch {
        // Browser storage is optional.
      }
    };
    for (const name of names) {
      const select = this.elements[name];
      select.addEventListener('change', persist);
      this.cleanup.push(() => select.removeEventListener('change', persist));
    }
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
      arena: this.elements.arenaSelect.value,
      drill: this.elements.trainingDrillSelect.value,
      difficulty: this.elements.difficultySelect.value,
      winningScore: Number(this.elements.winningScoreSelect.value),
    });
  }

  updateModeHint() {
    const ruleset = this.elements.rulesetSelect.value;
    const circuit = ruleset === RULESETS.CIRCUIT;
    const training = ruleset === RULESETS.TRAINING;
    const locked = circuit || training;
    if (locked) this.elements.modeSelect.value = GAME_MODES.SOLO;
    this.elements.modeSelect.disabled = locked;
    this.elements.difficultySelect.disabled = locked;
    this.elements.arenaSelect.disabled = locked;
    this.elements.powerUpsSelect.disabled = locked;
    this.elements.modeField.hidden = training;
    this.elements.arenaField.hidden = training;
    this.elements.powerUpsField.hidden = training;
    this.elements.trainingDrillField.hidden = !training;
    this.elements.circuitRoute.hidden = !circuit;
    const local = this.elements.modeSelect.value === GAME_MODES.LOCAL;
    this.elements.difficultyField.hidden = local || training;
    this.elements.winningScoreField.hidden = ruleset !== RULESETS.CLASSIC;
    const controls = local
      ? 'Игрок 1: W / S · Игрок 2: ↑ / ↓. На телефоне — два касания по сторонам поля.'
      : 'Вы управляете левой ракеткой мышью или стрелками. Справа — компьютер.';
    const rules = {
      [RULESETS.CLASSIC]: 'Побеждает первый, кто наберёт выбранное количество очков.',
      [RULESETS.SUDDEN_DEATH]: 'Первое очко решает весь матч.',
      [RULESETS.TIME_ATTACK]: '90 секунд активной игры. При ничьей — решающее очко.',
      [RULESETS.SURVIVAL]:
        'Испытание: забивай как можно больше, пока не пропустишь три мяча. Рекорд в одиночном режиме.',
      [RULESETS.CIRCUIT]:
        'Чемпионат из трёх этапов: 3 очка против новичка, 5 на FLUX, 7 на Portal против эксперта. Проиграл матч — турнир завершён.',
      [RULESETS.TRAINING]:
        '60 секунд чистого игрового времени. Выберите тренировку, чтобы улучшить свою технику.',
    };
    const extras =
      this.elements.powerUpsSelect.value === 'on'
        ? ' Усиления: ловите шаром капсулы, чтобы получить бонус.'
        : '';
    const arena =
      this.elements.arenaSelect.value === ARENAS.FLUX
        ? ' Арена FLUX: движущийся центральный отражатель меняет траекторию мяча.'
        : this.elements.arenaSelect.value === ARENAS.PORTAL
          ? ' Арена PORTAL: два связанных портала телепортируют мяч по полю.'
          : '';
    this.elements.modeHint.textContent = training
      ? `${controls} ${rules[ruleset]} ${DRILL_PROFILES[this.elements.trainingDrillSelect.value].description}`
      : circuit
        ? `${controls} ${rules[ruleset]}`
        : `${controls} ${rules[ruleset]}${extras}${arena}`;
  }

  setHistory(history) {
    const stats = summarizeHistory(history);
    this.elements.careerGames.textContent = String(stats.games);
    this.elements.careerWins.textContent = String(stats.wins);
    this.elements.careerRate.textContent = `${stats.winRate}%`;
    const recent = history.slice(0, 5);
    this.elements.recentMatchesList.replaceChildren(
      ...(recent.length
        ? recent.map((result) => {
            const li = this.root.createElement('li');
            const label =
              result.ruleset === RULESETS.TRAINING
                ? 'Тренировка'
                : result.ruleset === RULESETS.CIRCUIT
                  ? 'Чемпионат'
                : result.ruleset === RULESETS.SURVIVAL
                  ? 'Испытание'
                  : result.mode === GAME_MODES.LOCAL
                    ? 'Дуэль'
                    : 'Соло';
            const outcome =
              result.ruleset === RULESETS.TRAINING
                ? 'Завершено'
                : result.ruleset === RULESETS.CIRCUIT
                  ? result.winner === 'player'
                  ? 'Кубок'
                  : 'Вылет'
                : result.ruleset === RULESETS.SURVIVAL
                  ? 'Рекорд'
                  : result.winner === 'player'
                    ? 'Победа'
                    : 'Поражение';
            li.textContent = `${outcome} · ${result.playerScore}:${result.aiScore} · ${label}`;
            return li;
          })
        : [
            (() => {
              const li = this.root.createElement('li');
              li.textContent = 'Здесь появятся результаты последних матчей.';
              return li;
            })(),
          ]),
    );
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

  setSurvivalRecords(records) {
    const summary = summarizeSurvival(records);
    this.elements.survivalBest.textContent = String(summary.best);
    this.elements.survivalRuns.textContent = String(summary.runs);
    const top = summary.top.map((record, index) => {
      const li = this.root.createElement('li');
      const difficulty = { easy: 'Новичок', normal: 'Стандарт', hard: 'Эксперт' };
      li.textContent = `#${index + 1} · ${record.score} очк. · ${difficulty[record.difficulty]} · ${record.arena === 'flux' ? 'FLUX' : 'Классика'}`;
      return li;
    });
    if (top.length === 0) {
      const li = this.root.createElement('li');
      li.textContent = 'Сыграй испытание на выживание, чтобы установить рекорд.';
      top.push(li);
    }
    this.elements.survivalLeaderboard.replaceChildren(...top);
  }

  setCircuitRecords(records) {
    const summary = summarizeCircuit(records);
    this.elements.circuitBest.textContent = `${summary.best}/3`;
    this.elements.circuitTrophies.textContent = String(summary.trophies);
    this.elements.circuitAttempts.textContent = String(summary.attempts);
    const entries = summary.recent.map((record) => {
      const li = this.root.createElement('li');
      li.textContent = record.champion
        ? '★ ЧЕМПИОН · Все 3 этапа пройдены'
        : `Этапов пройдено: ${record.completed}/3`;
      return li;
    });
    if (entries.length === 0) {
      const li = this.root.createElement('li');
      li.textContent = 'Заверши чемпионат, чтобы записать результат.';
      entries.push(li);
    }
    this.elements.circuitHistory.replaceChildren(...entries);
  }

  setTrainingRecords(records) {
    const summary = summarizeTraining(records);
    this.elements.trainingPrecisionBest.textContent = String(summary.best.precision);
    this.elements.trainingRallyBest.textContent = String(summary.best.rally);
    this.elements.trainingReflexBest.textContent = String(summary.best.reflex);
    this.elements.trainingAttempts.textContent = String(summary.attempts);
    const entries = summary.recent.map((record) => {
      const li = this.root.createElement('li');
      li.textContent = `${DRILL_PROFILES[record.drill].name} · ${record.points} очк. · серия ${record.bestStreak}`;
      return li;
    });
    if (entries.length === 0) {
      const li = this.root.createElement('li');
      li.textContent = 'Заверши первую тренировку, чтобы установить рекорд.';
      entries.push(li);
    }
    this.elements.trainingHistory.replaceChildren(...entries);
  }

  showTrainingReward(reward) {
    this.elements.powerUpAlert.textContent = reward.kind === 'precision'
      ? reward.accurate ? 'ТОЧНО В ЦЕЛЬ · +3!' : 'ПОПАДАНИЕ · +1'
      : `СЕРИЯ ${reward.streak} · БОНУС +5!`;
    this.elements.powerUpAlert.hidden = false;
    if (this.alertTimeout !== null) window.clearTimeout(this.alertTimeout);
    this.alertTimeout = window.setTimeout(() => {
      this.elements.powerUpAlert.hidden = true;
      this.alertTimeout = null;
    }, 1300);
  }

  showCircuitRound(stage) {
    this.elements.powerUpAlert.textContent = `ЭТАП ${stage.round}/${stage.total} — ${stage.stage.title.toUpperCase()}!`;
    this.elements.powerUpAlert.hidden = false;
    if (this.alertTimeout !== null) window.clearTimeout(this.alertTimeout);
    this.alertTimeout = window.setTimeout(() => {
      this.elements.powerUpAlert.hidden = true;
      this.alertTimeout = null;
    }, 2000);
  }

  showPowerUp({ type, side, shield = false }) {
    const names = { expand: 'РАКЕТКА XL', turbo: 'ТУРБО', shield: 'ЭНЕРГОЩИТ' };
    const playerName = side === 'player' ? 'Игрок 1' : 'Игрок 2 / ИИ';
    this.elements.powerUpAlert.textContent = shield
      ? `${playerName} отразил удар щитом!`
      : `${playerName}: ${names[type] ?? 'БОНУС'}!`;
    this.elements.powerUpAlert.hidden = false;
    if (this.alertTimeout !== null) window.clearTimeout(this.alertTimeout);
    this.alertTimeout = window.setTimeout(() => {
      this.elements.powerUpAlert.hidden = true;
      this.alertTimeout = null;
    }, 1800);
  }

  destroy() {
    if (this.alertTimeout !== null) window.clearTimeout(this.alertTimeout);
    for (const dispose of this.cleanup.splice(0)) dispose();
  }

  render(snapshot) {
    const elements = this.elements;
    const training = snapshot.settings.ruleset === RULESETS.TRAINING;
    elements.trainingMetric.hidden = !training;
    if (training) {
      elements.trainingPoints.textContent = String(snapshot.training.points);
      elements.trainingClock.textContent = `${Math.ceil(snapshot.training.remainingSeconds)} С`;
      elements.trainingDetails.textContent = snapshot.training.drill === 'precision'
        ? `Цель: ${snapshot.training.target === 'top' ? 'ВЕРХ' : 'НИЗ'} · Точность ${snapshot.training.accuracy}%`
        : snapshot.training.drill === 'rally'
          ? `Серия: ${snapshot.training.streak} · Лучшее: ${snapshot.training.bestStreak}`
          : `Жизни: ${snapshot.training.lives} · Защита: ${snapshot.training.saves}`;
    }
    elements.playerScore.textContent = String(snapshot.score.player);
    elements.aiScore.textContent = String(snapshot.score.ai);
    const circuitMode = snapshot.settings.ruleset === RULESETS.CIRCUIT;
    elements.aiLabel.textContent = training
      ? 'Тренер'
      : circuitMode
        ? snapshot.circuit.stage.title
      : snapshot.settings.ruleset === RULESETS.SURVIVAL
        ? 'Пропущено'
        : snapshot.settings.mode === GAME_MODES.LOCAL
          ? 'Игрок 2'
          : 'Компьютер';
    elements.rallyValue.textContent = String(snapshot.rallyHits);
    elements.bestRallyValue.textContent = String(snapshot.bestRally);
    const survival = snapshot.settings.ruleset === RULESETS.SURVIVAL;
    elements.arenaMetric.textContent =
      snapshot.arena.mode === ARENAS.PORTAL
        ? `PORTAL · ТЕЛЕПОРТЫ ${snapshot.arena.totalTeleports}`
        : snapshot.arena.mode === ARENAS.FLUX
          ? `FLUX · ОТРАЖЕНИЯ ${snapshot.arena.totalBounces}`
          : 'АРЕНА CLASSIC';
    elements.circuitMetric.hidden = !circuitMode;
    if (circuitMode) {
      elements.circuitStage.textContent = `${snapshot.circuit.round}/${snapshot.circuit.total} · ${snapshot.circuit.stage.title} · до ${snapshot.settings.winningScore}`;
    }
    elements.survivalMetric.hidden = !survival;
    elements.survivalLives.textContent = String(snapshot.survivalLives);
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
      [RULESETS.SURVIVAL]: 'ВЫЖИВАНИЕ',
      [RULESETS.CIRCUIT]: 'ЧЕМПИОНАТ',
      [RULESETS.TRAINING]: 'ТРЕНИРОВКА',
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
      elements.resultTitle.textContent = training
        ? 'Тренировка завершена'
        : circuitMode
          ? snapshot.circuit.champion
          ? 'Ты чемпион PONC!'
          : 'Чемпионат завершён'
        : survival
          ? 'Испытание завершено'
          : snapshot.settings.mode === GAME_MODES.LOCAL
            ? `Победил игрок ${playerWon ? '1' : '2'}!`
            : playerWon
              ? 'Вы победили!'
              : 'Победил компьютер';
      elements.resultScore.textContent = training
        ? `${DRILL_PROFILES[snapshot.training.drill].name}: ${snapshot.training.points} очков. Лучший серия: ${snapshot.training.bestStreak}. ${snapshot.training.accuracy}% точности.`
        : circuitMode
          ? `Этапов пройдено: ${snapshot.circuit.completed}/3. ${snapshot.circuit.champion ? 'Кубок завоёван!' : 'Попробуй ещё раз.'}`
        : survival
          ? `Твой результат: ${snapshot.score.player} очков. Лучшая серия: ${snapshot.bestRally}`
          : `Финальный счёт: ${snapshot.score.player}:${snapshot.score.ai}. Лучшая серия: ${snapshot.bestRally}`;
    }
    document.documentElement.dataset.gameState = snapshot.state;
    document.documentElement.dataset.powerUps = String(snapshot.powerUps.enabled);
    document.documentElement.dataset.arena = snapshot.settings.arena;
    document.documentElement.dataset.ruleset = snapshot.settings.ruleset;
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
