// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { contrastRatio, parseColorTokens } from './contrast';

const white = { l: 1, c: 0, h: 0 };

describe('contrastRatio', () => {
  it('黑與白的對比為 21:1', () => {
    expect(contrastRatio({ l: 0, c: 0, h: 0 }, white)).toBeCloseTo(21, 2);
  });

  it('純紅 #FF0000 對白色約為 4:1，且與參數順序無關', () => {
    const red = { l: 0.62796, c: 0.25768, h: 29.2339 };
    expect(contrastRatio(red, white)).toBeCloseTo(4, 1);
    expect(contrastRatio(white, red)).toBeCloseTo(4, 1);
  });
});

describe('parseColorTokens', () => {
  it('讀出 --color-* 的 OKLCH 值，百分比亮度換成 0–1', () => {
    const css = `
      @theme {
        --color-surface: oklch(98.5% 0.005 250);
        --color-primary: oklch(42% 0.12 260);
        --font-sans: 'Noto Sans TC', sans-serif;
      }
    `;
    expect(parseColorTokens(css)).toEqual({
      surface: { l: 0.985, c: 0.005, h: 250 },
      primary: { l: 0.42, c: 0.12, h: 260 },
    });
  });
});
