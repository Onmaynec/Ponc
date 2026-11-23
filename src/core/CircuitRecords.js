const KEY = 'ponc:circuit-history:v1';
const LIMIT = 30;
const MAX_STAGES = 3;

export function readCircuitRecords(storage) {
  if (!storage) return [];
  try {
    const data = JSON.parse(storage.getItem(KEY) || '[]');
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (entry) =>
          entry &&
          Number.isInteger(entry.completed) &&
          entry.completed >= 0 &&
          entry.completed <= MAX_STAGES &&
          typeof entry.champion === 'boolean' &&
          (!entry.champion || entry.completed === MAX_STAGES) &&
          typeof entry.date === 'string' &&
          !Number.isNaN(Date.parse(entry.date)),
      )
      .slice(0, LIMIT);
  } catch {
    return [];
  }
}

export function saveCircuitResult(storage, snapshot, now = new Date()) {
  if (
    !storage ||
    !snapshot.winner ||
    snapshot.settings?.ruleset !== 'circuit' ||
    snapshot.settings?.mode !== 'solo'
  )
    return readCircuitRecords(storage);
  const completed = Math.max(0, Math.min(MAX_STAGES, snapshot.circuit?.completed ?? 0));
  const champion = snapshot.circuit?.champion === true && completed === MAX_STAGES;
  const entry = { completed, champion, date: now.toISOString() };
  const history = [entry, ...readCircuitRecords(storage)].slice(0, LIMIT);
  try {
    storage.setItem(KEY, JSON.stringify(history));
  } catch {
    // Storage may be private or blocked.
  }
  return history;
}

export function summarizeCircuit(records) {
  const trophies = records.filter((item) => item.champion).length;
  return {
    attempts: records.length,
    trophies,
    best: records.reduce((max, item) => Math.max(max, item.completed), 0),
    recent: records.slice(0, 5),
  };
}
