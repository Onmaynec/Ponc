// Championship is deliberately deterministic. A stage is a complete Pong match.
export const CIRCUIT_STAGES = Object.freeze([
  Object.freeze({
    id: 'qualifier',
    title: 'Квалификация',
    difficulty: 'easy',
    arena: 'classic',
    winningScore: 3,
    powerUps: false,
  }),
  Object.freeze({
    id: 'semifinal',
    title: 'Полуфинал',
    difficulty: 'normal',
    arena: 'flux',
    winningScore: 5,
    powerUps: true,
  }),
  Object.freeze({
    id: 'final',
    title: 'Финал',
    difficulty: 'hard',
    arena: 'portal',
    winningScore: 7,
    powerUps: true,
  }),
]);

export function getCircuitStage(index) {
  return CIRCUIT_STAGES[index] ?? null;
}

export function getCircuitProgress(circuit) {
  const stage = getCircuitStage(circuit.round);
  return {
    round: circuit.round + 1,
    total: CIRCUIT_STAGES.length,
    completed: circuit.completed,
    stage: stage ? { ...stage } : null,
    champion: circuit.champion,
    results: circuit.results.map((item) => ({
      ...item,
      score: { ...item.score },
    })),
  };
}
