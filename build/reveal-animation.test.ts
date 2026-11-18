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

/** 取出某個 CSS 屬性在所有宣告中的值（略過 @supports 條件裡的同名文字） */
function declarationValues(source: string, property: string): string[] {
  const pattern = new RegExp(String.raw`[{;]\s*${property}:\s*([^;{}]+);`, 'g');
  return [...source.matchAll(pattern)].map(([, value]) => value.trim());
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

/** 交錯排版（.reveal-stagger*）各規則 animation-timeline: view(<頂端內縮>% <底部內縮>%) 的內縮值 */
function staggerTimelineInsets(): { timeline: string; top: number; bottom: number }[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selector]) => /\.reveal-stagger\b/.test(selector))
    .flatMap(([, , body]) => declarationValues(`;${body}`, 'animation-timeline'))
    .map((timeline) => {
      const [, top = '0', bottom = '0'] = timeline.match(/^view\(\s*(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/) ?? [];
      return { timeline, top: Number(top), bottom: Number(bottom) };
    });
}

describe('區塊捲動動畫', () => {
  it.each(['reveal', 'reveal-stagger'])('%s：進入畫面時出現、離開畫面時消失', (name) => {
    const steps = keyframeSteps(css, name);
    const first = steps['from'] ?? steps['0%'];
    const last = steps['to'] ?? steps['100%'];

    expect(first).toMatch(/opacity:\s*0\b/);
    expect(last).toMatch(/opacity:\s*0\b/);
  });

  it('交錯排版往下捲時，內容進到畫面一段距離後才從完全空白開始淡入', () => {
    const insets = staggerTimelineInsets();

    expect(insets.length).toBeGreaterThan(0);
    for (const { timeline, bottom } of insets) expect(bottom, timeline).toBeGreaterThan(0);
  });

  it('交錯排版上滑時，內容在碰到視窗頂端前就完全消失', () => {
    const insets = staggerTimelineInsets();

    expect(insets.length).toBeGreaterThan(0);
    for (const { timeline, top } of insets) expect(top, timeline).toBeGreaterThan(0);
  });

  it('每條動畫範圍都延伸到離開畫面的階段', () => {
    const ranges = declarationValues(css, 'animation-range');

    expect(ranges.length).toBeGreaterThan(0);
    for (const range of ranges) {
      expect(range, range).toMatch(/\b(cover|exit)\b[^,]*$/);
    }
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
