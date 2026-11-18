// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

/** 找出 selector 符合條件的每條規則，回傳各自外層的 at-rule 前導（由外而內） */
function enclosingAtRules(source: string, selector: RegExp): string[][] {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const stack: string[] = [];
  const found: string[][] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '{') {
      const prelude = text.slice(start, i).trim();
      if (!prelude.startsWith('@') && selector.test(prelude)) found.push(stack.filter((p) => p.startsWith('@')));
      stack.push(prelude);
      start = i + 1;
    } else if (char === '}') {
      stack.pop();
      start = i + 1;
    } else if (char === ';') {
      start = i + 1;
    }
  }
  return found;
}

describe('捲動滑入動畫', () => {
  it('.reveal 規則只在支援 animation-timeline: view() 且使用者未要求減少動態時生效', () => {
    const contexts = enclosingAtRules(css, /\.reveal\b/);

    expect(contexts.length).toBeGreaterThan(0);
    for (const atRules of contexts) {
      expect(atRules).toContain('@supports (animation-timeline: view())');
      expect(atRules).toContain('@media (prefers-reduced-motion: no-preference)');
    }
  });
});
