export function createPaddle(config, side) {
  const isPlayer = side === 'player';
  return {
    x: isPlayer
      ? config.paddle.padding
      : config.field.width - config.paddle.padding - config.paddle.width,
    y: config.field.height / 2 - config.paddle.height / 2,
    width: config.paddle.width,
    height: config.paddle.height,
  };
}
