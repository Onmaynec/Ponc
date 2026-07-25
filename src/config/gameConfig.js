export const GAME_CONFIG = Object.freeze({
  field: Object.freeze({ width: 800, height: 400 }),
  ball: Object.freeze({
    radius: 8,
    initialSpeed: 300,
    maximumSpeed: 480,
    minimumHorizontalSpeed: 192,
    speedIncrement: 18,
    maximumBounceAngle: Math.PI / 4,
  }),
  paddle: Object.freeze({
    width: 10,
    height: 80,
    padding: 20,
    playerSpeed: 360,
    aiSpeed: 270,
    aiDeadZone: 30,
  }),
  match: Object.freeze({ winningScore: 11, countdownSeconds: 2 }),
  loop: Object.freeze({
    fixedStepSeconds: 1 / 120,
    maximumFrameDeltaSeconds: 0.1,
    maximumUpdatesPerFrame: 24,
  }),
});
