const STORAGE_KEY = 'ponc:survival-records:v1';
const MAX_RUNS = 30;

export function readSurvivalRecords(storage) {
  if (!storage) return [];
  try {
    const records = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(records)) return [];
    return records
      .filter(
        (record) =>
          record &&
          Number.isSafeInteger(record.score) &&
          record.score >= 0 &&
          record.score <= 100000 &&
          ['easy', 'normal', 'hard'].includes(record.difficulty) &&
          typeof record.date === 'string' &&
          !Number.isNaN(Date.parse(record.date)),
      )
      .slice(0, MAX_RUNS);
  } catch {
    return [];
  }
}

export function saveSurvivalRecord(storage, snapshot, now = new Date()) {
  if (
    !storage ||
    !snapshot.winner ||
    snapshot.settings.mode !== 'solo' ||
    snapshot.settings.ruleset !== 'survival'
  )
    return readSurvivalRecords(storage);
  const record = {
    score: snapshot.score.player,
    difficulty: snapshot.settings.difficulty,
    arena: snapshot.settings.arena === 'flux' ? 'flux' : 'classic',
    powerUps: snapshot.settings.powerUps === true,
    date: now.toISOString(),
  };
  const next = [record, ...readSurvivalRecords(storage)].slice(0, MAX_RUNS);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing / disabled storage must not break the match.
  }
  return next;
}

export function summarizeSurvival(records) {
  const sorted = [...records].sort(
    (a, b) => b.score - a.score || a.date.localeCompare(b.date),
  );
  return {
    runs: records.length,
    best: sorted[0]?.score ?? 0,
    top: sorted.slice(0, 5),
  };
}
