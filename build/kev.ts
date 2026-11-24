/**
 * CISA KEV（已遭駭客利用的漏洞目錄）統計模組：算出過去 7 天新增的數量與受影響最多的廠商。
 * 純函式，不連網；抓取由 update-kev.ts 負責。
 */
import { z } from 'zod';
import { KEV_WINDOW_DAYS, type KevFile } from '../src/data/kev.ts';

/** 橫幅最多列幾個廠商 */
const MAX_VENDORS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 只驗證用得到的欄位；目錄是空的視為格式不對（正式目錄有上千筆） */
const CatalogSchema = z.object({
  vulnerabilities: z
    .array(z.object({ dateAdded: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), vendorProject: z.string() }))
    .min(1),
});

/**
 * 統計過去 7 天（含今天，以 UTC 日期比較；CISA 的 dateAdded 是美國的日期）新增的漏洞。
 * 不是 KEV 目錄時回傳 null。
 */
export function summarizeKev(catalog: unknown, now: Date): KevFile | null {
  const parsed = CatalogSchema.safeParse(catalog);
  if (!parsed.success) return null;

  // YYYY-MM-DD 可以直接用字串比較大小
  const since = new Date(now.getTime() - (KEV_WINDOW_DAYS - 1) * DAY_MS).toISOString().slice(0, 10);
  const recent = parsed.data.vulnerabilities.filter((item) => item.dateAdded >= since);

  const counts = new Map<string, number>();
  for (const { vendorProject } of recent) {
    const vendor = vendorProject.trim();
    if (vendor) counts.set(vendor, (counts.get(vendor) ?? 0) + 1);
  }
  const topVendors = [...counts]
    .sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b, 'en'))
    .slice(0, MAX_VENDORS)
    .map(([vendor]) => vendor);

  return { updatedAt: now.toISOString(), added: recent.length, topVendors };
}
