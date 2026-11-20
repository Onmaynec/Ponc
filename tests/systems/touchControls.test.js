import assert from 'node:assert/strict';
import test from 'node:test';
import { GAME_CONFIG } from '../../src/config/gameConfig.js';
import { InputSystem } from '../../src/systems/InputSystem.js';
import { PhysicsSystem } from '../../src/systems/PhysicsSystem.js';
import { INPUT_MODES } from '../../src/core/constants.js';

function createInput() {
  const canvas = {
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 800, height: 400 }),
    setPointerCapture: () => {},
    focus: () => {},
  };
  return new InputSystem({ canvas, fieldHeight: 400 });
}

test('two simultaneous touch pointers control different local paddles', () => {
  const input = createInput();
  input.handlePointerDown({ pointerId: 1, pointerType: 'touch', clientX: 80, clientY: 70 });
  input.handlePointerDown({ pointerId: 2, pointerType: 'touch', clientX: 730, clientY: 330 });
  assert.deepEqual(input.getCommand('local'), {
    mode: INPUT_MODES.POINTER,
    direction: 0,
    targetY: 70,
  });
  assert.deepEqual(input.getSecondPlayerCommand(), {
    mode: INPUT_MODES.POINTER,
    direction: 0,
    targetY: 330,
    speedFactor: 1,
  });
  input.handlePointerMove({ pointerId: 2, pointerType: 'touch', clientY: 240 });
  assert.equal(input.getSecondPlayerCommand().targetY, 240);
  input.handlePointerUp({ pointerId: 1 });
  assert.equal(input.getCommand('local').mode, INPUT_MODES.KEYBOARD);
  assert.equal(input.getSecondPlayerCommand().mode, INPUT_MODES.POINTER);
  input.handlePointerUp({ pointerId: 2 });
  assert.equal(input.getSecondPlayerCommand().mode, undefined);
});

test('right paddle moves correctly for touch target', () => {
  const system = new PhysicsSystem(GAME_CONFIG);
  const paddle = { x: 770, y: 160, width: 10, height: 80 };
  system.updateAI(paddle, { mode: INPUT_MODES.POINTER, targetY: 290 }, 1 / 120);
  assert.equal(paddle.y, 250);
});

test('reset clears both touch targets', () => {
  const input = createInput();
  input.handlePointerDown({ pointerId: 4, pointerType: 'touch', clientX: 100, clientY: 80 });
  input.reset();
  assert.equal(input.getCommand('local').mode, INPUT_MODES.KEYBOARD);
});
