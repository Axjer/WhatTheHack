// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { summarizeKev } from './kev.ts';

/** 每日流程在台灣早上 06:07（UTC 前一天 22:07）執行 */
const now = new Date('2026-11-23T22:07:00.000Z');

function catalog(entries: [dateAdded: string, vendorProject: string][]) {
  return {
    title: 'CISA Catalog of Known Exploited Vulnerabilities',
    vulnerabilities: entries.map(([dateAdded, vendorProject], index) => ({
      cveID: `CVE-2026-${1000 + index}`,
      vendorProject,
      product: 'Some Product',
      dateAdded,
    })),
  };
}

describe('summarizeKev', () => {
  it('計算過去 7 天（含今天）新增的數量，以及受影響最多的兩個廠商', () => {
    const kev = summarizeKev(
      catalog([
        ['2026-11-23', 'Microsoft'],
        ['2026-11-21', 'Apple'],
        ['2026-11-20', 'Microsoft'],
        ['2026-11-19', 'Microsoft'],
        ['2026-11-17', 'Apple'],
        ['2026-11-17', 'Fortinet'],
        ['2026-11-16', 'Microsoft'], // 8 天前，不算
        ['2026-10-01', 'Google'],
      ]),
      now,
    );
    expect(kev).toEqual({ updatedAt: '2026-11-23T22:07:00.000Z', added: 6, topVendors: ['Microsoft', 'Apple'] });
  });

  it('同樣多次時依廠商名稱排序；只有一個廠商就只列一個', () => {
    expect(summarizeKev(catalog([['2026-11-22', 'Zimbra'], ['2026-11-22', 'Cisco'], ['2026-11-22', 'Ivanti']]), now)?.topVendors).toEqual([
      'Cisco',
      'Ivanti',
    ]);
    expect(summarizeKev(catalog([['2026-11-22', 'Apple'], ['2026-11-21', 'Apple']]), now)?.topVendors).toEqual(['Apple']);
  });

  it('過去 7 天沒有新增 → 數量 0、沒有廠商', () => {
    expect(summarizeKev(catalog([['2026-11-01', 'Microsoft']]), now)).toEqual({
      updatedAt: '2026-11-23T22:07:00.000Z',
      added: 0,
      topVendors: [],
    });
  });

  it('不是 KEV 目錄（例如錯誤頁或格式改變）→ null，讓更新腳本沿用上一份', () => {
    expect(summarizeKev({ message: 'Access Denied' }, now)).toBeNull();
    expect(summarizeKev({ vulnerabilities: [] }, now)).toBeNull();
    expect(summarizeKev(null, now)).toBeNull();
  });
});
