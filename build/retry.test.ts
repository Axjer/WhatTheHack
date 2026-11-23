import { describe, expect, it, vi } from 'vitest';
import { withRetry } from './retry.ts';

const retryable = (error: unknown) => error === 'busy';

describe('withRetry', () => {
  it('第一次就成功時直接回傳，不等待', async () => {
    const sleep = vi.fn(async () => {});
    const result = await withRetry(async () => 'ok', { delaysMs: [10, 20], isRetryable: retryable, sleep });
    expect(result).toBe('ok');
    expect(sleep).not.toHaveBeenCalled();
  });

  it('可重試的錯誤依序等待後重試，直到成功', async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn().mockRejectedValueOnce('busy').mockRejectedValueOnce('busy').mockResolvedValueOnce('ok');
    const result = await withRetry(fn, { delaysMs: [10, 20], isRetryable: retryable, sleep });
    expect(result).toBe('ok');
    expect(sleep.mock.calls).toEqual([[10], [20]]);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('重試次數用完仍失敗時丟出最後的錯誤', async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn().mockRejectedValue('busy');
    await expect(withRetry(fn, { delaysMs: [10, 20], isRetryable: retryable, sleep })).rejects.toBe('busy');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('不可重試的錯誤立刻丟出，不等待', async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn().mockRejectedValue('bad request');
    await expect(withRetry(fn, { delaysMs: [10, 20], isRetryable: retryable, sleep })).rejects.toBe('bad request');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
