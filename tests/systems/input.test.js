import assert from 'node:assert/strict';
import test from 'node:test';
import { INPUT_MODES } from '../../src/core/constants.js';
import { InputSystem } from '../../src/systems/InputSystem.js';

function createCanvas(width, height) {
  return {
    getBoundingClientRect: () => ({ top: 20, left: 0, width, height }),
    addEventListener() {},
    removeEventListener() {},
  };
}

test('maps pointer coordinates from CSS size to logical field', () => {
  for (const width of [800, 600, 400, 320]) {
    const height = width / 2;
    const input = new InputSystem({
      canvas: createCanvas(width, height),
      fieldHeight: 400,
    });
    input.setPointerFromClientY(20 + height / 2);
    assert.equal(input.getCommand().targetY, 200);
    assert.equal(input.getCommand().mode, INPUT_MODES.POINTER);
  }
});

test('normalizes keyboard state into a direction command', () => {
  const input = new InputSystem({ canvas: createCanvas(800, 400), fieldHeight: 400 });
  input.mode = INPUT_MODES.KEYBOARD;
  input.keys.ArrowDown = true;
  assert.deepEqual(input.getCommand(), {
    mode: INPUT_MODES.KEYBOARD,
    direction: 1,
    targetY: 200,
  });
});
