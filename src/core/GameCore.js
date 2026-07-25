import { GAME_CONFIG } from '../config/gameConfig.js';
import { createBall } from '../entities/createBall.js';
import { createPaddle } from '../entities/createPaddle.js';
import { AISystem } from '../systems/AISystem.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { EventBus } from './EventBus.js';
import { GAME_EVENTS, GAME_STATES, INPUT_MODES } from './constants.js';
import { GameStateMachine } from './GameStateMachine.js';

export class GameCore {
  constructor({ config = GAME_CONFIG, random = Math.random, eventBus } = {}) {
    this.config = config;
    this.random = random;
    this.events = eventBus ?? new EventBus();
    this.stateMachine = new GameStateMachine(this.events);
    this.physics = new PhysicsSystem(config);
    this.ai = new AISystem(config);
    this.pausedFromState = GAME_STATES.PLAYING;
    this.countdownRemainingSeconds = config.match.countdownSeconds;
    this.score = { player: 0, ai: 0 };
    this.winner = null;
    this.model = {
      ball: createBall(config),
      paddles: {
        player: createPaddle(config, 'player'),
        ai: createPaddle(config, 'ai'),
      },
    };
    this.resetPositions();
  }

  get state() {
    return this.stateMachine.state;
  }

  startMatch() {
    if (this.state !== GAME_STATES.MENU && this.state !== GAME_STATES.GAME_OVER) {
      this.returnToMenu();
    }
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
    if (this.state !== GAME_STATES.MENU) {
      this.stateMachine.transition(GAME_STATES.MENU);
    }
  }

  pause() {
    if (this.state !== GAME_STATES.PLAYING && this.state !== GAME_STATES.COUNTDOWN) {
      return false;
    }
    this.pausedFromState = this.state;
    this.stateMachine.transition(GAME_STATES.PAUSED);
    this.events.emit(GAME_EVENTS.PAUSED, this.getSnapshot());
    return true;
  }

  resume() {
    if (this.state !== GAME_STATES.PAUSED) return false;
    const nextState =
      this.pausedFromState === GAME_STATES.COUNTDOWN
        ? GAME_STATES.COUNTDOWN
        : GAME_STATES.PLAYING;
    this.stateMachine.transition(nextState);
    this.events.emit(GAME_EVENTS.RESUMED, this.getSnapshot());
    return true;
  }

  togglePause() {
    return this.state === GAME_STATES.PAUSED ? this.resume() : this.pause();
  }

  step(deltaSeconds, playerCommand = this.createNeutralInput()) {
    if (this.state === GAME_STATES.COUNTDOWN) {
      this.updateCountdown(deltaSeconds);
      return;
    }
    if (this.state !== GAME_STATES.PLAYING) return;

    const aiCommand = this.ai.createCommand(this.getSnapshot());
    const goal = this.physics.update(
      this.model,
      { player: playerCommand, ai: aiCommand },
      deltaSeconds,
    );
    if (goal) this.awardPoint(goal);
  }

  beginServe() {
    this.resetBall();
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
    if (side !== 'player' && side !== 'ai') {
      throw new Error(`Unknown scoring side: ${side}`);
    }

    this.score[side] += 1;
    this.events.emit(GAME_EVENTS.GOAL, {
      side,
      score: { ...this.score },
    });

    if (this.score[side] >= this.config.match.winningScore) {
      this.winner = side;
      this.stateMachine.transition(GAME_STATES.GAME_OVER);
      this.events.emit(GAME_EVENTS.GAME_OVER, this.getSnapshot());
    } else {
      this.beginServe();
    }
    return true;
  }

  resetScores() {
    this.score.player = 0;
    this.score.ai = 0;
    this.winner = null;
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
    this.model.ball.vx =
      this.config.ball.initialSpeed * direction * Math.cos(angle);
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
      winningScore: this.config.match.winningScore,
      field: { ...this.config.field },
      ball: { ...this.model.ball },
      paddles: {
        player: { ...this.model.paddles.player },
        ai: { ...this.model.paddles.ai },
      },
    };
  }
}
