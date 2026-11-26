/**
 * 數據卡的大數字：只保留最高位、其餘捨去，再加「+」（90,123 → 90,000+、38 → 30+）。
 * 數字每天會變，往下取整才不會誇大；剛好整數或個位數時照實顯示、不加「+」。
 * 沒有數字或不是合理的筆數（負數、NaN、無限大）時回傳 null，由畫面顯示「—」；小數先捨去成整數。
 */
export function formatApproxCount(count: number | null): string | null {
  if (count === null || !Number.isFinite(count) || count < 0) return null;
  const whole = Math.trunc(count);
  const magnitude = 10 ** (String(whole).length - 1);
  const floored = Math.floor(whole / magnitude) * magnitude;
  return `${floored.toLocaleString('zh-TW')}${floored < whole ? '+' : ''}`;
}
