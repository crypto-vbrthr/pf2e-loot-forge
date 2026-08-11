/** Convert a PF2e coin object to its total value in GP. */
export function priceToGp(price = {}) {
  if (typeof price === "number") return Math.round((Number(price) || 0) * 100) / 100;
  const cp = Number(price?.cp ?? 0);
  const sp = Number(price?.sp ?? 0);
  const gp = Number(price?.gp ?? 0);
  const pp = Number(price?.pp ?? 0);
  return Math.round((gp + sp / 10 + cp / 100 + pp * 10) * 100) / 100;
}

/**
 * Convert a GP value to whole PF2e coin denominations.
 * Keep GP as the largest denomination so a value such as 121.8 GP remains
 * recognizable as 121 GP + 8 SP rather than being converted to platinum.
 */
export function gpToCoins(valueGp) {
  let totalCp = Math.max(0, Math.round((Number(valueGp) || 0) * 100));
  const gp = Math.floor(totalCp / 100);
  totalCp -= gp * 100;
  const sp = Math.floor(totalCp / 10);
  const cp = totalCp - sp * 10;
  const result = {};
  if (gp) result.gp = gp;
  if (sp) result.sp = sp;
  if (cp) result.cp = cp;
  return Object.keys(result).length ? result : { gp: 0 };
}
