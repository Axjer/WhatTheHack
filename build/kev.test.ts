// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { KevFile } from '../src/data/kev.ts';
import { summarizeKev, updateKev } from './kev.ts';

/** 每日流程在台灣早上 06:07（UTC 前一天 22:07）執行；這天的 UTC 日期是 11/23 */
const now = new Date('2026-11-23T22:07:00.000Z');

/** 假的 KEV 目錄：每個日期代表一筆新增 */
function catalog(dates: string[]) {
  return {
    title: 'CISA Catalog of Known Exploited Vulnerabilities',
    vulnerabilities: dates.map((dateAdded, index) => ({
      cveID: `CVE-2026-${1000 + index}`,
      vendorProject: 'Microsoft',
      product: 'Windows',
      dateAdded,
    })),
  };
}

/** 11/17 到 11/23 每天的筆數 */
function week(counts: number[]) {
  return counts.map((count, index) => ({ date: `2026-11-${17 + index}`, count }));
}

describe('summarizeKev', () => {
  it('近 7 天（含今天）每天新增的筆數，由舊到新', () => {
    const kev = summarizeKev(
      catalog([
        '2026-11-23',
        '2026-11-23',
        '2026-11-21',
        '2026-11-17',
        '2026-11-16', // 8 天前，不算
      ]),
      now,
    );
    expect(kev).toEqual({
      updatedAt: '2026-11-23T22:07:00.000Z',
      daily: week([1, 0, 0, 0, 1, 0, 2]),
    });
  });

  it('以美東日期當「今天」：UTC 凌晨部署（例如推上 main）時美國還是前一天，視窗不往後移', () => {
    const earlyUtc = new Date('2026-11-24T02:00:00.000Z'); // 美東 11/23 21:00
    const kev = summarizeKev(catalog(['2026-11-23', '2026-11-17']), earlyUtc);
    expect(kev?.daily).toEqual(week([1, 0, 0, 0, 0, 0, 1]));
  });

  it('近 7 天都沒有新增 → 每天都是 0', () => {
    expect(summarizeKev(catalog(['2026-11-01']), now)?.daily).toEqual(week([0, 0, 0, 0, 0, 0, 0]));
  });

  it('不是 KEV 目錄（例如錯誤頁或格式改變）→ null，讓更新腳本沿用上一份', () => {
    expect(summarizeKev({ message: 'Access Denied' }, now)).toBeNull();
    expect(summarizeKev({ vulnerabilities: [] }, now)).toBeNull();
    expect(summarizeKev(null, now)).toBeNull();
  });
});

describe('updateKev：CISA 抓不到時，第一天沿用上一份，連續第二天才改抓 GitHub 上的官方副本', () => {
  const cisaCatalog = catalog(['2026-11-23']);
  const mirrorCatalog = catalog(['2026-11-23', '2026-11-23']);
  const fromCisa = week([0, 0, 0, 0, 0, 0, 1]);
  const fromMirror = week([0, 0, 0, 0, 0, 0, 2]);
  const yesterday: KevFile = { updatedAt: '2026-11-22T22:07:00.000Z', daily: week([3, 0, 0, 0, 0, 0, 0]) };

  /** 回傳兩個抓取函式，並記錄副本被抓了幾次 */
  function sources(cisa: unknown, mirror: unknown) {
    const calls = { mirror: 0 };
    const fetchers = {
      fetchCisa: async () => cisa,
      fetchMirror: async () => {
        calls.mirror++;
        return mirror;
      },
    };
    return { calls, fetchers };
  }

  it('CISA 抓得到 → 用 CISA 的資料，不抓副本，失敗紀錄清掉', async () => {
    const { calls, fetchers } = sources(cisaCatalog, mirrorCatalog);
    const kev = await updateKev({ ...fetchers, previous: { ...yesterday, cisaFailedSince: '2026-11-21T22:07:00.000Z' }, now });
    expect(kev).toEqual({ updatedAt: '2026-11-23T22:07:00.000Z', daily: fromCisa, cisaFailedSince: null });
    expect(calls.mirror).toBe(0);
  });

  it('第一天抓不到 → 沿用上一份（更新時間不變），記下開始抓不到的時間，不抓副本', async () => {
    const { calls, fetchers } = sources(null, mirrorCatalog);
    const kev = await updateKev({ ...fetchers, previous: yesterday, now });
    expect(kev).toEqual({ ...yesterday, cisaFailedSince: '2026-11-23T22:07:00.000Z' });
    expect(calls.mirror).toBe(0);
  });

  it('同一天內再次部署（例如推上 main）仍抓不到 → 還不算第二天，繼續沿用上一份', async () => {
    const { calls, fetchers } = sources(null, mirrorCatalog);
    const previous = { ...yesterday, cisaFailedSince: '2026-11-23T18:00:00.000Z' };
    expect(await updateKev({ ...fetchers, previous, now })).toEqual(previous);
    expect(calls.mirror).toBe(0);
  });

  it('連續第二天抓不到 → 改用副本的資料，保留開始抓不到的時間', async () => {
    const { fetchers } = sources(null, mirrorCatalog);
    const kev = await updateKev({ ...fetchers, previous: { ...yesterday, cisaFailedSince: '2026-11-22T22:07:00.000Z' }, now });
    expect(kev).toEqual({
      updatedAt: '2026-11-23T22:07:00.000Z',
      daily: fromMirror,
      cisaFailedSince: '2026-11-22T22:07:00.000Z',
    });
  });

  it('連續第二天抓不到，副本也抓不到 → 沿用上一份', async () => {
    const { fetchers } = sources(null, null);
    const previous = { ...yesterday, cisaFailedSince: '2026-11-22T22:07:00.000Z' };
    expect(await updateKev({ ...fetchers, previous, now })).toEqual(previous);
  });

  it('沒有上一份可沿用 → 直接改抓副本；副本也抓不到就回傳 null', async () => {
    expect((await updateKev({ ...sources(null, mirrorCatalog).fetchers, previous: null, now }))?.daily).toEqual(fromMirror);
    expect(await updateKev({ ...sources(null, null).fetchers, previous: null, now })).toBeNull();
  });

  it('上一份是從未更新過的佔位檔 → 視為沒有上一份，直接改抓副本', async () => {
    const placeholder: KevFile = { updatedAt: null, daily: [] };
    const kev = await updateKev({ ...sources(null, mirrorCatalog).fetchers, previous: placeholder, now });
    expect(kev?.daily).toEqual(fromMirror);
  });

  it('第一次失敗在延遲的排程（台灣 11/23 中午），隔天早上的排程只隔 18 小時，仍算第二天 → 改抓副本', async () => {
    const previous = { ...yesterday, cisaFailedSince: '2026-11-23T04:00:00.000Z' };
    // now 是台灣 11/24 06:07
    const kev = await updateKev({ ...sources(null, mirrorCatalog).fetchers, previous, now });
    expect(kev?.daily).toEqual(fromMirror);
  });
});
