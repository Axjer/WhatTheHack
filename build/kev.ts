/**
 * CISA 已被利用漏洞清單（KEV）統計模組：算出近 7 天每天新增的筆數，以及前 7 天的總數。
 * 純函式，不連網；抓取由 update-kev.ts 負責。
 */
import { z } from 'zod';
import { KEV_WINDOW_DAYS, type KevFile } from '../src/data/kev.ts';
import { DAY_MS, taipeiDay } from '../src/time.ts';

/** 只驗證用得到的欄位；目錄是空的視為格式不對（正式目錄有上千筆） */
const CatalogSchema = z.object({
  vulnerabilities: z.array(z.object({ dateAdded: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).min(1),
});

/** 往前推 daysAgo 天的 UTC 日期 YYYY-MM-DD */
function utcDate(now: Date, daysAgo: number): string {
  return new Date(now.getTime() - daysAgo * DAY_MS).toISOString().slice(0, 10);
}

/**
 * 統計近 7 天（含今天）每天新增的筆數與前 7 天的總數。
 * 以 UTC 日期比較：CISA 的 dateAdded 是美國的日期，排程在 UTC 22:07 執行時美國還是同一天。
 * 不是 KEV 目錄時回傳 null。
 */
export function summarizeKev(catalog: unknown, now: Date): KevFile | null {
  const parsed = CatalogSchema.safeParse(catalog);
  if (!parsed.success) return null;

  const counts = new Map<string, number>();
  for (const { dateAdded } of parsed.data.vulnerabilities) counts.set(dateAdded, (counts.get(dateAdded) ?? 0) + 1);

  const daily = Array.from({ length: KEV_WINDOW_DAYS }, (_, index) => {
    const date = utcDate(now, KEV_WINDOW_DAYS - 1 - index);
    return { date, count: counts.get(date) ?? 0 };
  });
  let previousWeek = 0;
  for (let daysAgo = KEV_WINDOW_DAYS; daysAgo < KEV_WINDOW_DAYS * 2; daysAgo++) {
    previousWeek += counts.get(utcDate(now, daysAgo)) ?? 0;
  }
  return { updatedAt: now.toISOString(), daily, previousWeek };
}

type UpdateKevInput = {
  /** 抓 CISA 官方的 KEV 目錄（已解析的 JSON）；失敗回傳 null */
  fetchCisa: () => Promise<unknown>;
  /** 抓 CISA 在 GitHub 上的官方副本；失敗回傳 null */
  fetchMirror: () => Promise<unknown>;
  /** 上一份統計檔；沒有時為 null */
  previous: KevFile | null;
  now: Date;
};

/**
 * 決定這次的 KEV 統計：
 * 1. CISA 抓得到 → 用 CISA，清掉失敗紀錄。
 * 2. 抓不到的第一天（或台灣時間同一天內再次部署）→ 沿用上一份，記下開始抓不到的時間。
 * 3. 台灣時間的隔天仍抓不到，或沒有上一份可沿用（包括從未更新過的佔位檔） → 改抓 GitHub 上的官方副本；副本也失敗就沿用上一份。
 * 什麼都沒有時回傳 null（保留現有檔案，不覆蓋）。
 */
export async function updateKev({ fetchCisa, fetchMirror, previous, now }: UpdateKevInput): Promise<KevFile | null> {
  const fromCisa = summarizeKev(await fetchCisa(), now);
  if (fromCisa) return { ...fromCisa, cisaFailedSince: null };

  // 從未更新過的佔位檔沒有資料可沿用，視同沒有上一份
  const usable = previous?.updatedAt ? previous : null;
  const failedSince = previous?.cisaFailedSince ?? now.toISOString();
  // 以台灣日期判斷「第二天」：同一天內的重新部署（例如推上 main）不算，排程延遲幾小時也不影響
  const secondDay = taipeiDay(failedSince) !== taipeiDay(now.getTime());
  if (usable && !secondDay) return { ...usable, cisaFailedSince: failedSince };

  const fromMirror = summarizeKev(await fetchMirror(), now);
  if (fromMirror) return { ...fromMirror, cisaFailedSince: failedSince };
  return usable && { ...usable, cisaFailedSince: failedSince };
}
