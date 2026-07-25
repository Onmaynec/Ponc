import { FixedStepAccumulator } from './FixedStepAccumulator.js';

export class GameLoop {
  constructor({ config, update, render, requestFrame = requestAnimationFrame }) {
    this.update = update;
    this.render = render;
    this.requestFrame = requestFrame;
    this.accumulator = new FixedStepAccumulator(config.loop);
    this.lastTimestamp = null;
    this.running = false;
    this.frame = this.frame.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = null;
    this.accumulator.reset();
    this.requestFrame(this.frame);
  }

  stop() {
    this.running = false;
    this.lastTimestamp = null;
    this.accumulator.reset();
  }

  frame(timestamp) {
    if (!this.running) return;
    if (this.lastTimestamp === null) this.lastTimestamp = timestamp;

    const frameDeltaSeconds = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    const result = this.accumulator.advance(frameDeltaSeconds, this.update);
    this.render(result.interpolation);
    this.requestFrame(this.frame);
  }
}
