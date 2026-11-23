import { describe, expect, it } from 'vitest';
import { formatRelativeDay } from './time';

/** 台灣時間 2026-11-23 10:00 */
const now = Date.parse('2026-11-23T02:00:00.000Z');

describe('formatRelativeDay：以台灣時間的日曆日比較', () => {
  it('同一天 → 今天', () => {
    expect(formatRelativeDay('2026-11-22T16:30:00.000Z', now)).toBe('今天'); // 台灣 11/23 00:30
  });

  it('前一天 → 昨天', () => {
    expect(formatRelativeDay('2026-11-22T15:30:00.000Z', now)).toBe('昨天'); // 台灣 11/22 23:30
  });

  it('更早 → 月/日', () => {
    expect(formatRelativeDay('2026-11-20T09:00:00.000Z', now)).toBe('11/20');
  });
});
