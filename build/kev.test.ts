// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { KevFile } from '../src/data/kev.ts';
import { summarizeKev, updateKev } from './kev.ts';

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

describe('updateKev：CISA 抓不到時，第一天沿用上一份，連續第二天才改抓 GitHub 上的官方副本', () => {
  const cisaCatalog = catalog([['2026-11-23', 'Microsoft']]);
  const mirrorCatalog = catalog([['2026-11-23', 'Apple']]);
  const yesterday: KevFile = { updatedAt: '2026-11-22T22:07:00.000Z', added: 3, topVendors: ['Cisco'] };

  /** 記錄有沒有抓副本 */
  function sources(cisa: unknown, mirror: unknown) {
    const calls = { mirror: 0 };
    return {
      calls,
      fetchCisa: async () => cisa,
      fetchMirror: async () => {
        calls.mirror++;
        return mirror;
      },
    };
  }

  it('CISA 抓得到 → 用 CISA 的資料，不抓副本，失敗紀錄清掉', async () => {
    const { calls, ...fetchers } = sources(cisaCatalog, mirrorCatalog);
    const kev = await updateKev({ ...fetchers, previous: { ...yesterday, cisaFailedSince: '2026-11-21T22:07:00.000Z' }, now });
    expect(kev).toEqual({ updatedAt: '2026-11-23T22:07:00.000Z', added: 1, topVendors: ['Microsoft'], cisaFailedSince: null });
    expect(calls.mirror).toBe(0);
  });

  it('第一天抓不到 → 沿用上一份（更新時間不變），記下開始抓不到的時間，不抓副本', async () => {
    const { calls, ...fetchers } = sources(null, mirrorCatalog);
    const kev = await updateKev({ ...fetchers, previous: yesterday, now });
    expect(kev).toEqual({ ...yesterday, cisaFailedSince: '2026-11-23T22:07:00.000Z' });
    expect(calls.mirror).toBe(0);
  });

  it('同一天內再次部署（例如推上 main）仍抓不到 → 還不算第二天，繼續沿用上一份', async () => {
    const { calls, ...fetchers } = sources(null, mirrorCatalog);
    const previous = { ...yesterday, cisaFailedSince: '2026-11-23T18:00:00.000Z' };
    expect(await updateKev({ ...fetchers, previous, now })).toEqual(previous);
    expect(calls.mirror).toBe(0);
  });

  it('連續第二天抓不到 → 改用副本的資料，保留開始抓不到的時間', async () => {
    const { ...fetchers } = sources(null, mirrorCatalog);
    const kev = await updateKev({ ...fetchers, previous: { ...yesterday, cisaFailedSince: '2026-11-22T22:07:00.000Z' }, now });
    expect(kev).toEqual({
      updatedAt: '2026-11-23T22:07:00.000Z',
      added: 1,
      topVendors: ['Apple'],
      cisaFailedSince: '2026-11-22T22:07:00.000Z',
    });
  });

  it('連續第二天抓不到，副本也抓不到 → 沿用上一份', async () => {
    const { ...fetchers } = sources(null, null);
    const previous = { ...yesterday, cisaFailedSince: '2026-11-22T22:07:00.000Z' };
    expect(await updateKev({ ...fetchers, previous, now })).toEqual(previous);
  });

  it('沒有上一份可沿用 → 直接改抓副本；副本也抓不到就回傳 null', async () => {
    expect(await updateKev({ ...sources(null, mirrorCatalog), previous: null, now })).toEqual({
      updatedAt: '2026-11-23T22:07:00.000Z',
      added: 1,
      topVendors: ['Apple'],
      cisaFailedSince: '2026-11-23T22:07:00.000Z',
    });
    expect(await updateKev({ ...sources(null, null), previous: null, now })).toBeNull();
  });
});
