export const ACHIEVEMENTS = Object.freeze([
  { id: 'first_win', title: 'Первая победа', description: 'Победи компьютер впервые' },
  { id: 'five_wins', title: 'Победитель', description: 'Выиграй 5 одиночных матчей' },
  { id: 'ten_wins', title: 'Ветеран арены', description: 'Выиграй 10 одиночных матчей' },
  {
    id: 'hard_win',
    title: 'Укротитель эксперта',
    description: 'Победи ИИ на сложности Эксперт',
  },
  { id: 'clean_sheet', title: 'Безупречный', description: 'Победи компьютер всухую' },
]);

export function unlockedAchievements(history) {
  const solo = history.filter(
    (item) =>
      item.mode === 'solo' && !['survival', 'circuit', 'training'].includes(item.ruleset),
  );
  const wins = solo.filter((item) => item.winner === 'player');
  const unlocked = new Set();
  if (wins.length >= 1) unlocked.add('first_win');
  if (wins.length >= 5) unlocked.add('five_wins');
  if (wins.length >= 10) unlocked.add('ten_wins');
  if (wins.some((item) => item.difficulty === 'hard')) unlocked.add('hard_win');
  if (wins.some((item) => item.aiScore === 0)) unlocked.add('clean_sheet');
  return ACHIEVEMENTS.map((item) => ({ ...item, unlocked: unlocked.has(item.id) }));
}
