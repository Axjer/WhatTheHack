// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildMaliciousList } from './malicious-list.ts';

const now = new Date('2026-11-20T00:00:00Z');

const urlhausCsv = [
  '################################################################',
  '# abuse.ch URLhaus Database Dump (CSV - recent URLs)            #',
  '################################################################',
  '#',
  '# id,dateadded,url,url_status,last_online,threat,tags,urlhaus_link,reporter',
  '"3400002","2026-11-19 10:23:11","http://192.168.10.20:5555/i","online","2026-11-19 22:00:00","malware_download","elf,mozi","https://urlhaus.abuse.ch/url/3400002/","someone"',
  '"3400001","2026-11-18 08:00:00","http://Malware-Download.example/Invoice.exe","online","","malware_download","exe","https://urlhaus.abuse.ch/url/3400001/","someone"',
  '"3399999","2026-11-10 08:00:00","http://gone.example/old.exe","offline","2026-11-11 08:00:00","malware_download","exe","https://urlhaus.abuse.ch/url/3399999/","someone"',
  '',
].join('\n');

describe('buildMaliciousList', () => {
  it('URLhaus：跳過註解，只收目前仍在線上的網址；首次發現為收錄時間，最後發現為最後在線時間', () => {
    const list = buildMaliciousList({ urlhausCsv, openphishText: null, previous: null, now });

    expect(list?.entries).toEqual([
      {
        url: 'http://192.168.10.20:5555/i',
        source: 'URLhaus',
        threat: 'malware',
        firstSeen: '2026-11-19T10:23:11.000Z',
        lastSeen: '2026-11-19T22:00:00.000Z',
      },
      {
        // 沒有最後在線時間：以這次更新的時間為準
        url: 'http://malware-download.example/invoice.exe',
        source: 'URLhaus',
        threat: 'malware',
        firstSeen: '2026-11-18T08:00:00.000Z',
        lastSeen: '2026-11-20T00:00:00.000Z',
      },
    ]);
  });

  it('URLhaus online.csv：收錄超過 30 天但仍在線上的網址照樣收進清單（#32）', () => {
    const onlineCsv = [
      '# abuse.ch URLhaus Database Dump (CSV - online URLs only)',
      '# id,dateadded,url,url_status,last_online,threat,tags,urlhaus_link,reporter',
      '"3100000","2026-08-01 08:00:00","http://still-online.example/old.exe","online","2026-11-19 23:00:00","malware_download","exe","https://urlhaus.abuse.ch/url/3100000/","someone"',
    ].join('\n');

    const list = buildMaliciousList({ urlhausCsv: onlineCsv, openphishText: null, previous: null, now });

    expect(list?.entries).toEqual([
      {
        url: 'http://still-online.example/old.exe',
        source: 'URLhaus',
        threat: 'malware',
        firstSeen: '2026-08-01T08:00:00.000Z',
        lastSeen: '2026-11-19T23:00:00.000Z',
      },
    ]);
  });

  it('合併與去重：正規化後相同的網址在同一來源只留一筆，兩個來源各留一筆', () => {
    const csv = [
      '"1","2026-11-15 00:00:00","https://EVIL.example/pay/","online","2026-11-16 00:00:00","malware_download","","",""',
      '"2","2026-11-12 00:00:00","https://www.evil.example/pay","online","2026-11-18 00:00:00","malware_download","","",""',
    ].join('\n');
    const list = buildMaliciousList({
      urlhausCsv: csv,
      openphishText: 'https://evil.example/pay\nhttps://EVIL.example/pay/',
      previous: null,
      now,
    });

    expect(list?.entries).toEqual([
      {
        url: 'https://evil.example/pay',
        source: 'OpenPhish',
        threat: 'phishing',
        firstSeen: '2026-11-20T00:00:00.000Z',
        lastSeen: '2026-11-20T00:00:00.000Z',
      },
      {
        url: 'https://evil.example/pay',
        source: 'URLhaus',
        threat: 'malware',
        firstSeen: '2026-11-12T00:00:00.000Z',
        lastSeen: '2026-11-18T00:00:00.000Z',
      },
    ]);
  });

  it('OpenPhish 沒有提供時間：上一份清單已有的網址沿用原本的首次發現時間', () => {
    const previous = {
      sourceUpdatedAt: { URLhaus: null, OpenPhish: '2026-11-19T00:00:00.000Z' },
      entries: [
        {
          url: 'https://phish.example/login',
          source: 'OpenPhish' as const,
          threat: 'phishing' as const,
          firstSeen: '2026-11-17T00:00:00.000Z',
          lastSeen: '2026-11-19T00:00:00.000Z',
        },
      ],
    };
    const list = buildMaliciousList({ urlhausCsv: null, openphishText: 'https://phish.example/login', previous, now });

    expect(list?.entries).toEqual([
      {
        url: 'https://phish.example/login',
        source: 'OpenPhish',
        threat: 'phishing',
        firstSeen: '2026-11-17T00:00:00.000Z',
        lastSeen: '2026-11-20T00:00:00.000Z',
      },
    ]);
  });

  describe('來源抓取失敗時不覆蓋為空清單', () => {
    const previous = {
      sourceUpdatedAt: { URLhaus: '2026-11-18T00:00:00.000Z', OpenPhish: '2026-11-19T00:00:00.000Z' },
      entries: [
        {
          url: 'http://old-malware.example/a.exe',
          source: 'URLhaus' as const,
          threat: 'malware' as const,
          firstSeen: '2026-11-10T00:00:00.000Z',
          lastSeen: '2026-11-18T00:00:00.000Z',
        },
        {
          url: 'https://old-phish.example',
          source: 'OpenPhish' as const,
          threat: 'phishing' as const,
          firstSeen: '2026-11-15T00:00:00.000Z',
          lastSeen: '2026-11-19T00:00:00.000Z',
        },
      ],
    };

    it.each([
      ['抓不到（null）', null],
      ['內容解析不出任何網址（例如錯誤頁）', '<!DOCTYPE HTML><html><title>410 Gone</title></html>'],
    ])('URLhaus %s → 保留上一份的 URLhaus 紀錄與更新時間，OpenPhish 照常更新', (_, failedCsv) => {
      const list = buildMaliciousList({
        urlhausCsv: failedCsv,
        openphishText: 'https://new-phish.example',
        previous,
        now,
      });

      expect(list?.sourceUpdatedAt).toEqual({ URLhaus: '2026-11-18T00:00:00.000Z', OpenPhish: '2026-11-20T00:00:00.000Z' });
      // old-phish.example 昨天才最後出現，掉出今天的 feed 但還在 7 天保留期內
      expect(list?.entries.map(({ url, source }) => `${source} ${url}`)).toEqual([
        'URLhaus http://old-malware.example/a.exe',
        'OpenPhish https://new-phish.example',
        'OpenPhish https://old-phish.example',
      ]);
    });

    it('只有 OpenPhish 失敗 → 保留上一份的 OpenPhish 紀錄與更新時間，URLhaus 照常更新', () => {
      const csv = '"1","2026-11-19 00:00:00","http://new-malware.example/b.exe","online","","malware_download","","",""';
      const list = buildMaliciousList({ urlhausCsv: csv, openphishText: null, previous, now });

      expect(list?.sourceUpdatedAt).toEqual({ URLhaus: '2026-11-20T00:00:00.000Z', OpenPhish: '2026-11-19T00:00:00.000Z' });
      expect(list?.entries.map(({ url, source }) => `${source} ${url}`)).toEqual([
        'URLhaus http://new-malware.example/b.exe',
        'OpenPhish https://old-phish.example',
      ]);
    });

    it('沒有上一份清單時，失敗的來源沒有更新時間', () => {
      const list = buildMaliciousList({ urlhausCsv: null, openphishText: 'https://new-phish.example', previous: null, now });
      expect(list?.sourceUpdatedAt).toEqual({ URLhaus: null, OpenPhish: '2026-11-20T00:00:00.000Z' });
    });

    it('兩個來源都失敗 → 整份沿用上一份清單，更新時間不變', () => {
      expect(buildMaliciousList({ urlhausCsv: null, openphishText: '', previous, now })).toEqual(previous);
    });

    it('兩個來源都失敗且沒有上一份清單 → 不產生清單', () => {
      expect(buildMaliciousList({ urlhausCsv: null, openphishText: null, previous: null, now })).toBeNull();
    });
  });

  describe('OpenPhish：掉出今天 feed 的網址保留 7 天才真正移除', () => {
    const previous = {
      sourceUpdatedAt: { URLhaus: '2026-11-19T00:00:00.000Z', OpenPhish: '2026-11-19T00:00:00.000Z' },
      entries: [
        {
          // 6 天前最後出現：還在保留期內
          url: 'https://recently-gone.example',
          source: 'OpenPhish' as const,
          threat: 'phishing' as const,
          firstSeen: '2026-11-10T00:00:00.000Z',
          lastSeen: '2026-11-14T00:01:00.000Z',
        },
        {
          // 超過 7 天沒出現：移除
          url: 'https://long-gone.example',
          source: 'OpenPhish' as const,
          threat: 'phishing' as const,
          firstSeen: '2026-11-01T00:00:00.000Z',
          lastSeen: '2026-11-12T00:00:00.000Z',
        },
      ],
    };

    it('今天的 feed 裡沒有這兩個網址：6 天前的保留（時間不變），超過 7 天的移除', () => {
      const list = buildMaliciousList({ urlhausCsv: null, openphishText: 'https://new-phish.example', previous, now });

      expect(list?.entries).toContainEqual(previous.entries[0]);
      expect(list?.entries.map((e) => e.url)).not.toContain('https://long-gone.example');
    });

    it('URLhaus 不適用這個保留期：掉出今天 CSV 的網址照常立刻移除', () => {
      const urlhausPrevious = {
        sourceUpdatedAt: { URLhaus: '2026-11-19T00:00:00.000Z', OpenPhish: null },
        entries: [
          {
            url: 'https://recently-gone-urlhaus.example',
            source: 'URLhaus' as const,
            threat: 'malware' as const,
            firstSeen: '2026-11-10T00:00:00.000Z',
            lastSeen: '2026-11-14T00:01:00.000Z',
          },
        ],
      };
      const csv = '"1","2026-11-19 00:00:00","http://other.example/a.exe","online","","malware_download","","",""';
      const list = buildMaliciousList({ urlhausCsv: csv, openphishText: null, previous: urlhausPrevious, now });

      expect(list?.entries.map((e) => e.url)).not.toContain('https://recently-gone-urlhaus.example');
    });
  });

  describe('大量資料時不會爆堆疊', () => {
    // 展開運算子塞進 push() 的參數列表，資料量大時會超過引擎的參數數量上限
    // 實際在 GitHub Actions 上，9 萬多筆就撞到了（呼叫堆疊深度不同，門檻會變動），這裡刻意抓大一點確保能重現
    const LARGE = 500_000;

    function hugeUrlhausCsv(count: number): string {
      const rows = Array.from(
        { length: count },
        (_, i) => `"${i}","2026-11-19 00:00:00","http://host${i}.example/a","online","2026-11-19 00:00:00","malware_download","","",""`,
      );
      return rows.join('\n');
    }

    it('來源成功、資料量很大時也能正常合併', () => {
      const list = buildMaliciousList({ urlhausCsv: hugeUrlhausCsv(LARGE), openphishText: null, previous: null, now });
      expect(list?.entries).toHaveLength(LARGE);
    }, 20_000);

    it('來源抓取失敗、沿用的上一份紀錄資料量很大時也能正常合併', () => {
      const previous = {
        sourceUpdatedAt: { URLhaus: '2026-11-19T00:00:00.000Z', OpenPhish: null },
        entries: Array.from({ length: LARGE }, (_, i) => ({
          url: `http://host${i}.example/a`,
          source: 'URLhaus' as const,
          threat: 'malware' as const,
          firstSeen: '2026-11-19T00:00:00.000Z',
          lastSeen: '2026-11-19T00:00:00.000Z',
        })),
      };
      expect(() =>
        buildMaliciousList({ urlhausCsv: null, openphishText: 'https://new-phish.example', previous, now }),
      ).not.toThrow();
    });
  });

  it('OpenPhish：每行一個網址，正規化後成為釣魚紀錄，發現時間為這次更新', () => {
    const list = buildMaliciousList({
      urlhausCsv: null,
      openphishText: 'https://WWW.Phish.example/Login/\n\nhttp://bank-verify.example/a?b=1\n',
      previous: null,
      now,
    });

    expect(list).toEqual({
      sourceUpdatedAt: { URLhaus: null, OpenPhish: '2026-11-20T00:00:00.000Z' },
      entries: [
        {
          url: 'http://bank-verify.example/a?b=1',
          source: 'OpenPhish',
          threat: 'phishing',
          firstSeen: '2026-11-20T00:00:00.000Z',
          lastSeen: '2026-11-20T00:00:00.000Z',
        },
        {
          url: 'https://phish.example/login',
          source: 'OpenPhish',
          threat: 'phishing',
          firstSeen: '2026-11-20T00:00:00.000Z',
          lastSeen: '2026-11-20T00:00:00.000Z',
        },
      ],
    });
  });
});
