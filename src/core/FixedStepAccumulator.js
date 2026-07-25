export class FixedStepAccumulator {
  constructor({ fixedStepSeconds, maximumFrameDeltaSeconds, maximumUpdatesPerFrame }) {
    this.fixedStepSeconds = fixedStepSeconds;
    this.maximumFrameDeltaSeconds = maximumFrameDeltaSeconds;
    this.maximumUpdatesPerFrame = maximumUpdatesPerFrame;
    this.accumulator = 0;
  }

  reset() {
    this.accumulator = 0;
  }

  advance(frameDeltaSeconds, update) {
    const safeDelta = Math.max(
      0,
      Math.min(frameDeltaSeconds, this.maximumFrameDeltaSeconds),
    );
    this.accumulator += safeDelta;

    let updates = 0;
    const epsilon = this.fixedStepSeconds * 1e-9;
    while (
      this.accumulator + epsilon >= this.fixedStepSeconds &&
      updates < this.maximumUpdatesPerFrame
    ) {
      update(this.fixedStepSeconds);
      this.accumulator = Math.max(0, this.accumulator - this.fixedStepSeconds);
      updates += 1;
    }

    if (updates === this.maximumUpdatesPerFrame) {
      this.accumulator = 0;
    }

    return {
      updates,
      interpolation: this.accumulator / this.fixedStepSeconds,
    };
  }
}
