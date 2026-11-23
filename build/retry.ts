/** 遇到暫時性錯誤時依序等待後重試 */
export interface RetryOptions {
  /** 每次重試前等待的毫秒數；長度就是最多重試幾次 */
  delaysMs: readonly number[];
  /** 這個錯誤值不值得重試（例如伺服器過載）；不值得就立刻丟出 */
  isRetryable: (error: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { delaysMs, isRetryable, sleep = defaultSleep } = options;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= delaysMs.length || !isRetryable(error)) throw error;
      await sleep(delaysMs[attempt]);
    }
  }
}
