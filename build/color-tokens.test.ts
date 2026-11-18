// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio, parseColorTokens } from './contrast';

const tokens = parseColorTokens(readFileSync(new URL('../src/index.css', import.meta.url), 'utf8'));

/** 實際會出現的「文字 on 底色」組合（CLAUDE.md 色彩 token 用途） */
const textOnBackground = [
  ['text-primary', 'surface'],
  ['text-secondary', 'surface'],
  ['text-secondary', 'surface-raised'],
  ['primary', 'surface'],
  ['surface-raised', 'primary'],
  ['surface-raised', 'primary-hover'],
  ['danger', 'danger-bg'],
  ['text-primary', 'warning-bg'],
  ['text-primary', 'warning'],
  ['unknown', 'unknown-bg'],
] as const;

describe('色彩 token 對比度', () => {
  it.each(textOnBackground)('%s 文字在 %s 底上達 WCAG AA（4.5:1）', (text, background) => {
    expect(tokens[text], `缺少 --color-${text}`).toBeDefined();
    expect(tokens[background], `缺少 --color-${background}`).toBeDefined();
    expect(contrastRatio(tokens[text], tokens[background])).toBeGreaterThanOrEqual(4.5);
  });
});
