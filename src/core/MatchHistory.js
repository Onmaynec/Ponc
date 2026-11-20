const STORAGE_KEY = 'ponc:match-history:v1';
const MAX_MATCHES = 50;

export function readMatchHistory(storage) {
  if (!storage) return [];
  try {
    const data = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((item) => item && (item.winner === 'player' || item.winner === 'ai') &&
      Number.isInteger(item.playerScore) && item.playerScore >= 0 && Number.isInteger(item.aiScore) && item.aiScore >= 0 &&
      (item.mode === 'solo' || item.mode === 'local')).slice(0, MAX_MATCHES);
  } catch { return []; }
}

export function saveMatchResult(storage, snapshot, now = new Date()) {
  if (!storage || !snapshot.winner) return readMatchHistory(storage);
  const entry = {
    winner: snapshot.winner,
    playerScore: snapshot.score.player,
    aiScore: snapshot.score.ai,
    mode: snapshot.settings.mode,
    difficulty: snapshot.settings.difficulty,
    date: now.toISOString(),
  };
  const results = [entry, ...readMatchHistory(storage)].slice(0, MAX_MATCHES);
  try { storage.setItem(STORAGE_KEY, JSON.stringify(results)); } catch { /* private mode/quota: session still playable */ }
  return results;
}

export function summarizeHistory(history) {
  const solo = history.filter((result) => result.mode === 'solo');
  const wins = solo.filter((result) => result.winner === 'player').length;
  return { games: solo.length, wins, losses: solo.length - wins, winRate: solo.length ? Math.round((wins / solo.length) * 100) : 0 };
}
