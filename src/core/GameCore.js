import { GAME_CONFIG } from '../config/gameConfig.js';
import { createBall } from '../entities/createBall.js';
import { createPaddle } from '../entities/createPaddle.js';
import { AISystem } from '../systems/AISystem.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { EventBus } from './EventBus.js';
import { GAME_EVENTS, GAME_STATES, INPUT_MODES } from './constants.js';
import { GameStateMachine } from './GameStateMachine.js';
import { DEFAULT_SETTINGS, GAME_MODES, RULESETS, TIME_ATTACK_SECONDS, normalizeSettings } from './MatchSettings.js';

export class GameCore {
  constructor({ config = GAME_CONFIG, random = Math.random, eventBus } = {}) {
    this.config = config;
    this.random = random;
    this.events = eventBus ?? new EventBus();
    this.stateMachine = new GameStateMachine(this.events);
    this.physics = new PhysicsSystem(config);
    this.ai = new AISystem(config);
    this.settings = { ...DEFAULT_SETTINGS };
    this.pausedFromState = GAME_STATES.PLAYING;
    this.countdownRemainingSeconds = config.match.countdownSeconds;
    this.score = { player: 0, ai: 0 };
    this.winner = null;
    this.rallyHits = 0;
    this.bestRally = 0;
    this.remainingSeconds = TIME_ATTACK_SECONDS;
    this.overtime = false;
    this.model = {
      ball: createBall(config),
      paddles: { player: createPaddle(config, 'player'), ai: createPaddle(config, 'ai') },
    };
    this.resetPositions();
  }

  get state() {
    return this.stateMachine.state;
  }

  configure(settings) {
    if (this.state !== GAME_STATES.MENU && this.state !== GAME_STATES.GAME_OVER)
      return false;
    this.settings = normalizeSettings(settings);
    return true;
  }

  startMatch() {
    if (this.state !== GAME_STATES.MENU && this.state !== GAME_STATES.GAME_OVER)
      this.returnToMenu();
    this.resetScores();
    this.resetPositions();
    this.beginServe();
    this.events.emit(GAME_EVENTS.RESET, this.getSnapshot());
  }

  restartMatch() {
    if (this.state !== GAME_STATES.MENU) this.returnToMenu();
    this.startMatch();
  }

  returnToMenu() {
    this.resetScores();
    this.resetPositions();
    if (this.state !== GAME_STATES.MENU) this.stateMachine.transition(GAME_STATES.MENU);
  }

  pause() {
    if (this.state !== GAME_STATES.PLAYING && this.state !== GAME_STATES.COUNTDOWN)
      return false;
    this.pausedFromState = this.state;
    this.stateMachine.transition(GAME_STATES.PAUSED);
    this.events.emit(GAME_EVENTS.PAUSED, this.getSnapshot());
    return true;
  }

  resume() {
    if (this.state !== GAME_STATES.PAUSED) return false;
    this.stateMachine.transition(
      this.pausedFromState === GAME_STATES.COUNTDOWN
        ? GAME_STATES.COUNTDOWN
        : GAME_STATES.PLAYING,
    );
    this.events.emit(GAME_EVENTS.RESUMED, this.getSnapshot());
    return true;
  }

  togglePause() {
    return this.state === GAME_STATES.PAUSED ? this.resume() : this.pause();
  }

  step(
    deltaSeconds,
    playerCommand = this.createNeutralInput(),
    secondPlayerCommand = { direction: 0 },
  ) {
    if (this.state === GAME_STATES.COUNTDOWN) {
      this.updateCountdown(deltaSeconds);
      return;
    }
    if (this.state !== GAME_STATES.PLAYING) return;
    if (this.settings.ruleset === RULESETS.TIME_ATTACK && !this.overtime) {
      this.remainingSeconds = Math.max(0, this.remainingSeconds - deltaSeconds);
      if (this.remainingSeconds === 0) {
        if (this.score.player !== this.score.ai) {
          this.finishMatch(this.score.player > this.score.ai ? 'player' : 'ai');
          return;
        }
        this.overtime = true;
        return;
      }
    }
    const aiCommand =
      this.settings.mode === GAME_MODES.LOCAL
        ? {
            ...secondPlayerCommand,
            speedFactor: this.config.paddle.playerSpeed / this.config.paddle.aiSpeed,
          }
        : this.ai.createCommand(this.getSnapshot());
    const ballBefore = { vx: this.model.ball.vx };
    const goal = this.physics.update(
      this.model,
      { player: playerCommand, ai: aiCommand },
      deltaSeconds,
    );
    if (Math.sign(ballBefore.vx) !== Math.sign(this.model.ball.vx)) {
      this.rallyHits += 1;
      this.bestRally = Math.max(this.bestRally, this.rallyHits);
    }
    if (goal) this.awardPoint(goal);
  }

  beginServe() {
    this.resetBall();
    this.rallyHits = 0;
    this.countdownRemainingSeconds = this.config.match.countdownSeconds;
    this.stateMachine.transition(GAME_STATES.COUNTDOWN);
    this.events.emit(GAME_EVENTS.SERVE_STARTED, this.getSnapshot());
  }

  updateCountdown(deltaSeconds) {
    this.countdownRemainingSeconds = Math.max(
      0,
      this.countdownRemainingSeconds - deltaSeconds,
    );
    if (this.countdownRemainingSeconds === 0) {
      this.stateMachine.transition(GAME_STATES.PLAYING);
      this.events.emit(GAME_EVENTS.SERVE_ACTIVE, this.getSnapshot());
    }
  }

  awardPoint(side) {
    if (this.state !== GAME_STATES.PLAYING) return false;
    if (side !== 'player' && side !== 'ai')
      throw new Error(`Unknown scoring side: ${side}`);
    this.score[side] += 1;
    this.events.emit(GAME_EVENTS.GOAL, { side, score: { ...this.score } });
    if (
      this.settings.ruleset === RULESETS.SUDDEN_DEATH ||
      (this.settings.ruleset === RULESETS.TIME_ATTACK && this.overtime) ||
      (this.settings.ruleset === RULESETS.CLASSIC &&
        this.score[side] >= this.settings.winningScore)
    ) this.finishMatch(side);
    else this.beginServe();
    return true;
  }

  finishMatch(side) {
    this.winner = side;
    this.stateMachine.transition(GAME_STATES.GAME_OVER);
    this.events.emit(GAME_EVENTS.GAME_OVER, this.getSnapshot());
  }

  resetScores() {
    this.score.player = 0;
    this.score.ai = 0;
    this.winner = null;
    this.rallyHits = 0;
    this.bestRally = 0;
    this.remainingSeconds = TIME_ATTACK_SECONDS;
    this.overtime = false;
  }
  resetPositions() {
    const centerY = this.config.field.height / 2 - this.config.paddle.height / 2;
    this.model.paddles.player.y = centerY;
    this.model.paddles.ai.y = centerY;
    this.resetBall();
  }
  resetBall() {
    const angle = (this.random() - 0.5) * (Math.PI / 3);
    const direction = this.random() >= 0.5 ? 1 : -1;
    this.model.ball.x = this.config.field.width / 2;
    this.model.ball.y = this.config.field.height / 2;
    this.model.ball.vx = this.config.ball.initialSpeed * direction * Math.cos(angle);
    this.model.ball.vy = this.config.ball.initialSpeed * Math.sin(angle);
  }
  createNeutralInput() {
    return {
      mode: INPUT_MODES.KEYBOARD,
      direction: 0,
      targetY: this.config.field.height / 2,
    };
  }
  getSnapshot() {
    return {
      state: this.state,
      countdownRemainingSeconds: this.countdownRemainingSeconds,
      score: { ...this.score },
      winner: this.winner,
      winningScore: this.settings.winningScore,
      settings: { ...this.settings },
      rallyHits: this.rallyHits,
      bestRally: this.bestRally,
      remainingSeconds: this.remainingSeconds,
      overtime: this.overtime,
      field: { ...this.config.field },
      ball: { ...this.model.ball },
      paddles: {
        player: { ...this.model.paddles.player },
        ai: { ...this.model.paddles.ai },
      },
    };
  }
}
