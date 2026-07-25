import { INPUT_MODES } from '../core/constants.js';

export class InputSystem {
  constructor({ canvas, fieldHeight, callbacks = {} }) {
    this.canvas = canvas;
    this.fieldHeight = fieldHeight;
    this.callbacks = callbacks;
    this.mode = INPUT_MODES.POINTER;
    this.pointerY = fieldHeight / 2;
    this.keys = { ArrowUp: false, ArrowDown: false };
    this.attached = false;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  attach() {
    if (this.attached) return;
    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.attached = true;
  }

  detach() {
    if (!this.attached) return;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.attached = false;
  }

  reset() {
    this.keys.ArrowUp = false;
    this.keys.ArrowDown = false;
    this.pointerY = this.fieldHeight / 2;
  }

  getCommand() {
    return {
      mode: this.mode,
      direction: Number(this.keys.ArrowDown) - Number(this.keys.ArrowUp),
      targetY: this.pointerY,
    };
  }

  setPointerFromClientY(clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.height <= 0) return;
    const logicalY = (clientY - rect.top) * (this.fieldHeight / rect.height);
    this.pointerY = Math.max(0, Math.min(this.fieldHeight, logicalY));
    this.mode = INPUT_MODES.POINTER;
  }

  gameHasFocus() {
    const activeElement = document.activeElement;
    return (
      activeElement === this.canvas || Boolean(activeElement?.closest?.('.game-area'))
    );
  }

  handleKeyDown(event) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      this.keys[event.key] = true;
      this.mode = INPUT_MODES.KEYBOARD;
      if (this.gameHasFocus()) event.preventDefault();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.callbacks.onTogglePause?.();
      return;
    }

    if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      this.callbacks.onRestart?.();
    }
  }

  handleKeyUp(event) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      this.keys[event.key] = false;
    }
  }

  handlePointerMove(event) {
    this.setPointerFromClientY(event.clientY);
  }

  handlePointerDown(event) {
    this.setPointerFromClientY(event.clientY);
    this.canvas.focus({ preventScroll: true });
  }

  handleBlur() {
    this.reset();
    this.callbacks.onAutomaticPause?.();
  }

  handleVisibilityChange() {
    if (document.hidden) this.handleBlur();
  }
}
