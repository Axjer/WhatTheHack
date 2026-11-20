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
      expect(list?.entries.map(({ url, source }) => `${source} ${url}`)).toEqual([
        'URLhaus http://old-malware.example/a.exe',
        'OpenPhish https://new-phish.example',
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
