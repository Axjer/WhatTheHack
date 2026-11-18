/** OKLCH 顏色：l 為 0–1 的亮度，c 為彩度，h 為色相角度 */
export type Oklch = { l: number; c: number; h: number };

/** OKLCH → 線性 sRGB（超出色域的分量截到 0–1） */
function toLinearSrgb({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const lms = [
    (l + 0.3963377774 * a + 0.2158037573 * b) ** 3,
    (l - 0.1055613458 * a - 0.0638541728 * b) ** 3,
    (l - 0.0894841775 * a - 1.291485548 * b) ** 3,
  ];
  const [L, M, S] = lms;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  return [
    clamp(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S),
    clamp(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S),
    clamp(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S),
  ];
}

function relativeLuminance(color: Oklch): number {
  const [r, g, b] = toLinearSrgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 對比度（1–21） */
export function contrastRatio(a: Oklch, b: Oklch): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/** 從 CSS 讀出 `--color-<name>: oklch(L% C H)` 形式的 token，以 name 為鍵 */
export function parseColorTokens(css: string): Record<string, Oklch> {
  const tokens: Record<string, Oklch> = {};
  const pattern = /--color-([\w-]+):\s*oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/g;
  for (const [, name, l, c, h] of css.matchAll(pattern)) {
    tokens[name] = { l: Number(l) / 100, c: Number(c), h: Number(h) };
  }
  return tokens;
}
