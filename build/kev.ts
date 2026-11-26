/**
 * CISA 已被利用漏洞清單（KEV）統計模組：整理出近 30 天正被攻擊的產品清單。
 * 純函式，不連網；抓取由 update-kev.ts 負責。
 */
import { z } from 'zod';
import { KEV_WINDOW_DAYS, type KevFile, type KevProduct } from '../src/data/kev.ts';
import { DAY_MS, taipeiDay } from '../src/time.ts';

/** 只驗證用得到的欄位；目錄是空的視為格式不對（正式目錄有上千筆） */
const CatalogSchema = z.object({
  vulnerabilities: z
    .array(
      z.object({
        dateAdded: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        vendorProject: z.string(),
        product: z.string(),
        knownRansomwareCampaignUse: z.string().optional(),
      }),
    )
    .min(1),
});

/**
 * 一般人常用的軟體與設備：顯示名稱（小寫）以這些字開頭時排在清單前面。手動維護。
 * 大廠只列個人會用的產品，同廠商的伺服器產品（例如 Microsoft Exchange Server）不算；
 * Apple、Android 與家用路由器廠商則整個廠商都算。
 */
const EVERYDAY_PREFIXES = [
  'microsoft windows',
  'microsoft office',
  'microsoft word',
  'microsoft excel',
  'microsoft powerpoint',
  'microsoft outlook',
  'microsoft edge',
  'microsoft teams',
  'google chrome',
  'google chromium',
  // CISA 的 Android 漏洞廠商欄就是 Android（如 Android Framework、Android Kernel）
  'android',
  'apple',
  'mozilla firefox',
  'mozilla thunderbird',
  'adobe acrobat',
  'adobe reader',
  'rarlab winrar',
  '7-zip',
  'samsung mobile',
  // 家用路由器
  'tp-link',
  'd-link',
  'asus',
];

function isEveryday(name: string): boolean {
  const lower = name.toLowerCase();
  return EVERYDAY_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/**
 * 「廠商 產品」；產品名已以廠商名的第一個字開頭時只用產品名，避免重複
 * （例如 Google / Google Chrome、Barracuda Networks / Barracuda Email Security Gateway）。
 */
function productName(vendor: string, product: string): string {
  const [v, p] = [vendor.trim(), product.trim()];
  const firstWord = (text: string) => text.split(/\s+/)[0].toLowerCase();
  return firstWord(p) === firstWord(v) ? p : `${v} ${p}`;
}

/** CISA 位在美東：dateAdded 是美東的日期 */
const usEasternDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 從 today（YYYY-MM-DD）往前推 daysAgo 天的日期；純日期運算，以 UTC 午夜計算避免時區干擾 */
function daysBefore(today: string, daysAgo: number): string {
  return new Date(Date.parse(`${today}T00:00:00Z`) - daysAgo * DAY_MS).toISOString().slice(0, 10);
}

/**
 * 整理近 30 天（含今天）收錄的漏洞：同一產品（廠商＋產品，不分大小寫）合併成一項，
 * 一般人常用的軟體（EVERYDAY_PREFIXES）排在前面，前後兩段各自依最近收錄日期由新到舊；同一天時漏洞多的在前，再依名稱。
 * 「今天」以美東日期為準：不論排程或推上 main 的部署在什麼時間執行，視窗都對齊 CISA 的日期。
 * 不是 KEV 目錄時回傳 null。
 */
export function summarizeKev(catalog: unknown, now: Date): KevFile | null {
  const parsed = CatalogSchema.safeParse(catalog);
  if (!parsed.success) return null;

  // 日期都是 YYYY-MM-DD，可以直接比字串
  const since = daysBefore(usEasternDay.format(now), KEV_WINDOW_DAYS - 1);
  const byProduct = new Map<string, KevProduct>();
  for (const { dateAdded, vendorProject, product, knownRansomwareCampaignUse } of parsed.data.vulnerabilities) {
    if (dateAdded < since) continue;
    const name = productName(vendorProject, product);
    const key = name.toLowerCase();
    const ransomware = knownRansomwareCampaignUse === 'Known';
    const existing = byProduct.get(key);
    if (!existing) {
      byProduct.set(key, { name, count: 1, latestDate: dateAdded, ransomware, everyday: isEveryday(name) });
    } else {
      existing.count++;
      if (dateAdded > existing.latestDate) existing.latestDate = dateAdded;
      existing.ransomware ||= ransomware;
    }
  }

  const products = [...byProduct.values()].sort(
    (a, b) =>
      Number(b.everyday) - Number(a.everyday) ||
      b.latestDate.localeCompare(a.latestDate) ||
      b.count - a.count ||
      a.name.localeCompare(b.name),
  );
  return { updatedAt: now.toISOString(), products };
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
