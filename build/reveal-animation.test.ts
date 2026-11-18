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

/** 取出 @keyframes <name> 的各個步驟：{ 步驟選擇器: 宣告內容 } */
function keyframeSteps(source: string, name: string): Record<string, string> {
  const start = source.indexOf(`@keyframes ${name}`);
  if (start === -1) return {};
  const open = source.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (; end < source.length; end++) {
    if (source[end] === '{') depth++;
    if (source[end] === '}' && --depth === 0) break;
  }
  const steps: Record<string, string> = {};
  for (const [, selector, body] of source.slice(open + 1, end).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const step of selector.split(',')) steps[step.trim()] = body;
  }
  return steps;
}

describe('捲動滑入動畫', () => {
  it('區塊進入畫面時出現、離開畫面時消失', () => {
    const steps = keyframeSteps(css, 'reveal');
    const first = steps['from'] ?? steps['0%'];
    const last = steps['to'] ?? steps['100%'];

    expect(first).toMatch(/opacity:\s*0\b/);
    expect(last).toMatch(/opacity:\s*0\b/);
  });

  it('.reveal 規則只在支援 animation-timeline: view() 且使用者未要求減少動態時生效', () => {
    const contexts = enclosingAtRules(css, /\.reveal\b/);

    expect(contexts.length).toBeGreaterThan(0);
    for (const atRules of contexts) {
      expect(atRules).toContain('@supports (animation-timeline: view())');
      expect(atRules).toContain('@media (prefers-reduced-motion: no-preference)');
    }
  });
});
