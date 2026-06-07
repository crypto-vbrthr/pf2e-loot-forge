export function weightedPick(weightMap = {}) {
  const entries = Object.entries(weightMap).filter(([_key, value]) => Number(value) > 0);
  const total = entries.reduce((sum, [_key, value]) => sum + Number(value), 0);

  if (!entries.length || total <= 0) return null;

  let roll = Math.random() * total;

  for (const [key, value] of entries) {
    roll -= Number(value);
    if (roll <= 0) return key;
  }

  return entries.at(-1)?.[0] ?? null;
}
