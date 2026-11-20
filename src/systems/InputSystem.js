import { INPUT_MODES } from '../core/constants.js';

export class InputSystem {
  constructor({ canvas, fieldHeight, callbacks = {} }) {
    this.canvas = canvas;
    this.fieldHeight = fieldHeight;
    this.callbacks = callbacks;
    this.mode = INPUT_MODES.POINTER;
    this.pointerY = fieldHeight / 2;
    this.keys = { ArrowUp: false, ArrowDown: false, KeyW: false, KeyS: false };
    this.attached = false;
    this.touchTargets = { player: null, ai: null };
    this.pointerSides = new Map();
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
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
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointercancel', this.handlePointerUp);
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
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp);
    this.attached = false;
  }

  reset() {
    for (const key of Object.keys(this.keys)) this.keys[key] = false;
    this.pointerY = this.fieldHeight / 2;
    this.touchTargets.player = null;
    this.touchTargets.ai = null;
    this.pointerSides.clear();
  }

  getCommand(mode = 'solo') {
    const local = mode === 'local';
    if (local && this.touchTargets.player !== null) {
      return {
        mode: INPUT_MODES.POINTER,
        direction: 0,
        targetY: this.touchTargets.player,
      };
    }
    return {
      mode: local ? INPUT_MODES.KEYBOARD : this.mode,
      direction: local
        ? Number(this.keys.KeyS) - Number(this.keys.KeyW)
        : Number(this.keys.ArrowDown) - Number(this.keys.ArrowUp),
      targetY: this.pointerY,
    };
  }

  getSecondPlayerCommand() {
    if (this.touchTargets.ai !== null) {
      return {
        mode: INPUT_MODES.POINTER,
        direction: 0,
        targetY: this.touchTargets.ai,
        speedFactor: 1,
      };
    }
    return {
      direction: Number(this.keys.ArrowDown) - Number(this.keys.ArrowUp),
      speedFactor: 1,
    };
  }

  clientYToField(clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.height <= 0) return this.fieldHeight / 2;
    const logicalY = (clientY - rect.top) * (this.fieldHeight / rect.height);
    return Math.max(0, Math.min(this.fieldHeight, logicalY));
  }

  setPointerFromClientY(clientY) {
    this.pointerY = this.clientYToField(clientY);
    this.mode = INPUT_MODES.POINTER;
  }

  gameHasFocus() {
    const activeElement = document.activeElement;
    return (
      activeElement === this.canvas || Boolean(activeElement?.closest?.('.game-area'))
    );
  }

  handleKeyDown(event) {
    const code = event.code === 'KeyW' || event.code === 'KeyS' ? event.code : event.key;
    if (Object.prototype.hasOwnProperty.call(this.keys, code)) {
      this.keys[code] = true;
      if (code === 'ArrowUp' || code === 'ArrowDown') this.mode = INPUT_MODES.KEYBOARD;
      if (this.gameHasFocus()) event.preventDefault();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.callbacks.onTogglePause?.();
      return;
    }
    if (
      event.key.toLowerCase() === 'r' &&
      !event.repeat &&
      !['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target?.tagName)
    ) {
      event.preventDefault();
      this.callbacks.onRestart?.();
    }
  }

  handleKeyUp(event) {
    const code = event.code === 'KeyW' || event.code === 'KeyS' ? event.code : event.key;
    if (Object.prototype.hasOwnProperty.call(this.keys, code)) this.keys[code] = false;
  }

  handlePointerMove(event) {
    this.setPointerFromClientY(event.clientY);
    if (event.pointerType === 'touch' && this.pointerSides.has(event.pointerId)) {
      this.touchTargets[this.pointerSides.get(event.pointerId)] = this.clientYToField(
        event.clientY,
      );
    }
  }

  handlePointerDown(event) {
    this.setPointerFromClientY(event.clientY);
    if (event.pointerType === 'touch') {
      const rect = this.canvas.getBoundingClientRect();
      const side = event.clientX < rect.left + rect.width / 2 ? 'player' : 'ai';
      this.pointerSides.set(event.pointerId, side);
      this.touchTargets[side] = this.clientYToField(event.clientY);
      try {
        this.canvas.setPointerCapture(event.pointerId);
      } catch {
        /* optional */
      }
    }
    this.canvas.focus({ preventScroll: true });
  }

  handlePointerUp(event) {
    if (!this.pointerSides.has(event.pointerId)) return;
    const side = this.pointerSides.get(event.pointerId);
    this.pointerSides.delete(event.pointerId);
    if (![...this.pointerSides.values()].includes(side)) this.touchTargets[side] = null;
  }
  handleBlur() {
    this.reset();
    this.callbacks.onAutomaticPause?.();
  }
  handleVisibilityChange() {
    if (document.hidden) this.handleBlur();
  }
}
