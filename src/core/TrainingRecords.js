import { TRAINING_DRILLS } from './TrainingSystem.js';

const KEY = 'ponc:training-records:v1';
const LIMIT = 60;
const DRILLS = Object.values(TRAINING_DRILLS);

export function readTrainingRecords(storage) {
  if (!storage) return [];
  try {
    const records = JSON.parse(storage.getItem(KEY) || '[]');
    if (!Array.isArray(records)) return [];
    return records.filter((item) => (
      item &&
      DRILLS.includes(item.drill) &&
      Number.isSafeInteger(item.points) && item.points >= 0 && item.points <= 100000 &&
      Number.isSafeInteger(item.bestStreak) &&
      item.bestStreak >= 0 && item.bestStreak <= 100000 &&
      Number.isSafeInteger(item.accuracy) && item.accuracy >= 0 && item.accuracy <= 100 &&
      typeof item.date === 'string' && !Number.isNaN(Date.parse(item.date))
    )).slice(0, LIMIT);
  } catch {
    return [];
  }
}

export function saveTrainingRecord(storage, snapshot, now = new Date()) {
  if (
    !storage ||
    !snapshot.winner ||
    snapshot.settings?.ruleset !== 'training' ||
    snapshot.settings?.mode !== 'solo' ||
    !snapshot.training?.enabled
  ) return readTrainingRecords(storage);
  const entry = {
    drill: snapshot.training.drill,
    points: snapshot.training.points,
    bestStreak: snapshot.training.bestStreak,
    accuracy: snapshot.training.accuracy,
    date: now.toISOString(),
  };
  if (
    !DRILLS.includes(entry.drill) ||
    !Number.isSafeInteger(entry.points) ||
    entry.points < 0 ||
    entry.points > 100000
  ) return readTrainingRecords(storage);
  const next = [entry, ...readTrainingRecords(storage)].slice(0, LIMIT);
  try {
    storage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Disabled storage must not disrupt play.
  }
  return next;
}

export function summarizeTraining(records) {
  const best = Object.fromEntries(DRILLS.map((drill) => [
    drill,
    records.filter((item) => item.drill === drill).reduce(
      (max, item) => Math.max(max, item.points),
      0,
    ),
  ]));
  return {
    attempts: records.length,
    best,
    recent: records.slice(0, 5).map((item) => ({ ...item })),
  };
}
