// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { KevFile, KevProduct } from '../src/data/kev.ts';
import { summarizeKev, updateKev } from './kev.ts';

/** 每日流程在台灣早上 06:07（UTC 前一天 22:07）執行；這天的 UTC 日期是 11/23 */
const now = new Date('2026-11-23T22:07:00.000Z');

/** 假的 KEV 目錄的一筆；沒指定廠商與產品時是 Microsoft Windows */
type Entry = { dateAdded: string; vendorProject?: string; product?: string; knownRansomwareCampaignUse?: string };

/** 假的 KEV 目錄；只給日期的項目是 Microsoft Windows */
function catalog(entries: (Entry | string)[]) {
  return {
    title: 'CISA Catalog of Known Exploited Vulnerabilities',
    vulnerabilities: entries.map((entry, index) => {
      const {
        dateAdded,
        vendorProject = 'Microsoft',
        product = 'Windows',
        knownRansomwareCampaignUse = 'Unknown',
      } = typeof entry === 'string' ? { dateAdded: entry } : entry;
      return {
        cveID: `CVE-2026-${1000 + index}`,
        vendorProject,
        product,
        vulnerabilityName: 'Some Vulnerability',
        dateAdded,
        shortDescription: 'Some description.',
        knownRansomwareCampaignUse,
      };
    }),
  };
}

function windows(count: number, latestDate: string, ransomware = false): KevProduct {
  return { name: 'Microsoft Windows', count, latestDate, ransomware };
}

/** 清單的「名稱 漏洞數」，方便比對排序 */
function names(kev: KevFile | null) {
  return kev?.products.map(({ name, count }) => `${name} ${count}`);
}

describe('summarizeKev', () => {
  it('近 30 天（含今天）同一產品的漏洞合併成一項，記下漏洞數與最近收錄日期', () => {
    const kev = summarizeKev(
      catalog([
        '2026-11-20',
        '2026-11-23',
        '2026-10-25', // 含今天往前第 30 天，算
        '2026-10-24', // 第 31 天，不算
      ]),
      now,
    );
    expect(kev).toEqual({
      updatedAt: '2026-11-23T22:07:00.000Z',
      products: [windows(3, '2026-11-23')],
    });
  });

  it('依最近收錄日期由新到舊排列；同一天時漏洞多的在前，再依名稱', () => {
    const kev = summarizeKev(
      catalog([
        { dateAdded: '2026-11-10', vendorProject: 'Fortinet', product: 'FortiOS' },
        { dateAdded: '2026-11-21', vendorProject: 'Apple', product: 'iOS' },
        { dateAdded: '2026-11-21', vendorProject: 'Cisco', product: 'IOS XE' },
        { dateAdded: '2026-11-15', vendorProject: 'Cisco', product: 'IOS XE' },
        { dateAdded: '2026-11-21', vendorProject: 'Adobe', product: 'Acrobat' },
      ]),
      now,
    );
    expect(names(kev)).toEqual(['Cisco IOS XE 2', 'Adobe Acrobat 1', 'Apple iOS 1', 'Fortinet FortiOS 1']);
  });

  it('產品名已含廠商名時不重複；大小寫或前後空白不同仍視為同一產品', () => {
    const kev = summarizeKev(
      catalog([
        { dateAdded: '2026-11-22', vendorProject: 'Google', product: 'Google Chrome' },
        { dateAdded: '2026-11-21', vendorProject: 'google ', product: ' google chrome' },
        { dateAdded: '2026-11-20', vendorProject: 'Microsoft', product: 'Windows' },
        // 產品名只以廠商名的第一個字開頭，也不重複
        { dateAdded: '2026-11-19', vendorProject: 'Barracuda Networks', product: 'Barracuda Email Security Gateway (ESG)' },
      ]),
      now,
    );
    expect(names(kev)).toEqual(['Google Chrome 2', 'Microsoft Windows 1', 'Barracuda Email Security Gateway (ESG) 1']);
  });

  it('任一漏洞已被勒索軟體利用（Known）→ 標記這個產品', () => {
    const kev = summarizeKev(
      catalog([
        '2026-11-23',
        { dateAdded: '2026-11-20', knownRansomwareCampaignUse: 'Known' },
        { dateAdded: '2026-11-22', vendorProject: 'Apple', product: 'iOS' },
      ]),
      now,
    );
    expect(kev?.products).toEqual([
      windows(2, '2026-11-23', true),
      { name: 'Apple iOS', count: 1, latestDate: '2026-11-22', ransomware: false },
    ]);
  });

  it('以美東日期當「今天」：UTC 凌晨部署（例如推上 main）時美國還是前一天，視窗不往後移', () => {
    const earlyUtc = new Date('2026-11-24T02:00:00.000Z'); // 美東 11/23 21:00
    const kev = summarizeKev(catalog(['2026-11-23', '2026-10-25']), earlyUtc);
    expect(kev?.products).toEqual([windows(2, '2026-11-23')]);
  });

  it('近 30 天都沒有新增 → 空清單', () => {
    expect(summarizeKev(catalog(['2026-10-01']), now)?.products).toEqual([]);
  });

  it('不存 CVE 編號與 CISA 的英文描述', () => {
    expect(JSON.stringify(summarizeKev(catalog(['2026-11-23']), now))).not.toMatch(/CVE-|Some description|Some Vulnerability/);
  });

  it('不是 KEV 目錄（例如錯誤頁或格式改變）→ null，讓更新腳本沿用上一份', () => {
    expect(summarizeKev({ message: 'Access Denied' }, now)).toBeNull();
    expect(summarizeKev({ vulnerabilities: [] }, now)).toBeNull();
    expect(summarizeKev({ vulnerabilities: [{ dateAdded: '2026-11-23' }] }, now)).toBeNull();
    expect(summarizeKev(null, now)).toBeNull();
  });
});

describe('updateKev：CISA 抓不到時，第一天沿用上一份，連續第二天才改抓 GitHub 上的官方副本', () => {
  const cisaCatalog = catalog(['2026-11-23']);
  const mirrorCatalog = catalog(['2026-11-23', '2026-11-22']);
  const fromCisa = [windows(1, '2026-11-23')];
  const fromMirror = [windows(2, '2026-11-23')];
  const yesterday: KevFile = { updatedAt: '2026-11-22T22:07:00.000Z', products: [windows(3, '2026-11-20')] };

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
    expect(kev).toEqual({ updatedAt: '2026-11-23T22:07:00.000Z', products: fromCisa, cisaFailedSince: null });
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
      products: fromMirror,
      cisaFailedSince: '2026-11-22T22:07:00.000Z',
    });
  });

  it('連續第二天抓不到，副本也抓不到 → 沿用上一份', async () => {
    const { fetchers } = sources(null, null);
    const previous = { ...yesterday, cisaFailedSince: '2026-11-22T22:07:00.000Z' };
    expect(await updateKev({ ...fetchers, previous, now })).toEqual(previous);
  });

  it('沒有上一份可沿用 → 直接改抓副本；副本也抓不到就回傳 null', async () => {
    expect((await updateKev({ ...sources(null, mirrorCatalog).fetchers, previous: null, now }))?.products).toEqual(fromMirror);
    expect(await updateKev({ ...sources(null, null).fetchers, previous: null, now })).toBeNull();
  });

  it('上一份是從未更新過的佔位檔 → 視為沒有上一份，直接改抓副本', async () => {
    const placeholder: KevFile = { updatedAt: null, products: [] };
    const kev = await updateKev({ ...sources(null, mirrorCatalog).fetchers, previous: placeholder, now });
    expect(kev?.products).toEqual(fromMirror);
  });

  it('第一次失敗在延遲的排程（台灣 11/23 中午），隔天早上的排程只隔 18 小時，仍算第二天 → 改抓副本', async () => {
    const previous = { ...yesterday, cisaFailedSince: '2026-11-23T04:00:00.000Z' };
    // now 是台灣 11/24 06:07
    const kev = await updateKev({ ...sources(null, mirrorCatalog).fetchers, previous, now });
    expect(kev?.products).toEqual(fromMirror);
  });
});
