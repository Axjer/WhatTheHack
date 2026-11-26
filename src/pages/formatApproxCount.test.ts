import { describe, expect, it } from 'vitest';
import { formatApproxCount } from './formatApproxCount';

describe('formatApproxCount', () => {
  it.each([
    [90123, '90,000+'],
    [38, '30+'],
    [41, '40+'],
    [30, '30'],
    [100000, '100,000'],
    [6, '6'],
    [0, '0'],
    [38.7, '30+'],
    [0.5, '0'],
  ])('%s → %s', (count, expected) => {
    expect(formatApproxCount(count)).toBe(expected);
  });

  it.each([null, -38, Number.NaN, Number.POSITIVE_INFINITY])('%s 不是合理的筆數，回傳 null', (count) => {
    expect(formatApproxCount(count)).toBeNull();
  });
});
