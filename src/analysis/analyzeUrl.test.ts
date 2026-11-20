import { describe, expect, it } from 'vitest';
import { analyzeUrl, type MaliciousEntry } from './analyzeUrl';

/** 假的惡意網址清單：不依賴真實資料 */
const fakeList: MaliciousEntry[] = [
  {
    url: 'https://evil.example/login',
    source: 'URLhaus',
    threat: 'malware',
    firstSeen: '2026-11-10T00:00:00Z',
    lastSeen: '2026-11-18T00:00:00Z',
  },
  {
    url: 'https://evil.example/login',
    source: 'OpenPhish',
    threat: 'phishing',
    firstSeen: '2026-11-08T00:00:00Z',
    lastSeen: '2026-11-15T00:00:00Z',
  },
  {
    url: 'http://www.Phish.example/',
    source: 'OpenPhish',
    threat: 'phishing',
    firstSeen: '2026-11-01T00:00:00Z',
    lastSeen: '2026-11-02T00:00:00Z',
  },
  {
    url: 'https://drive.google.com/file/d/bad-file/view',
    source: 'URLhaus',
    threat: 'malware',
    firstSeen: '2026-11-01T00:00:00Z',
    lastSeen: '2026-11-03T00:00:00Z',
  },
  {
    url: 'https://attacker.github.io/steal',
    source: 'OpenPhish',
    threat: 'phishing',
    firstSeen: '2026-11-01T00:00:00Z',
    lastSeen: '2026-11-04T00:00:00Z',
  },
];

function analyzed(input: string) {
  const result = analyzeUrl(input, fakeList);
  if (result.status !== 'analyzed') throw new Error(`「${input}」應該是網址`);
  return result;
}

describe('非網址輸入 → 請輸入網址', () => {
  it.each([
    ['空字串', ''],
    ['只有空白', '   '],
    ['一般文字', '你好'],
    ['英文單字', 'hello'],
    ['含網址的整段訊息', '您的包裹 https://evil.example/login 待領取'],
    ['網址前面黏著中文', '看這個evil.example'],
    ['多個網址（空白分隔）', 'https://a.example https://b.example'],
    ['多個網址（換行分隔）', 'https://a.example\nhttps://b.example'],
    ['多個網址（逗號分隔）', 'a.example,b.example'],
    ['多個網址（黏在一起）', 'https://a.examplehttps://b.example'],
    ['email', 'someone@example.com'],
    ['電話號碼', '0912-345-678'],
    ['小數', '3.14'],
    ['已 defang（hxxp）', 'hxxps://evil.example'],
    ['已 defang（[.]）', 'https://evil[.]example'],
    ['已 defang（無 scheme）', 'evil[.]example'],
    ['非 http(s) 的 scheme', 'ftp://evil.example'],
    ['javascript scheme', 'javascript:alert(1)'],
  ])('%s', (_, input) => {
    expect(analyzeUrl(input, fakeList)).toEqual({ status: 'not-url' });
  });

  it.each(['http://192.168.0.1/admin', 'https://example.org/wiki/駭客', 'https://台灣.tw', 'https://user@example.org'])(
    '%s 是網址',
    (input) => {
      expect(analyzeUrl(input, fakeList).status).toBe('analyzed');
    },
  );
});

describe('正規化', () => {
  it('沒有 scheme 時補上 http://', () => {
    expect(analyzed('example.org/path').normalizedUrl).toBe('http://example.org/path');
  });

  it.each([
    'https://example.org/path',
    '  https://example.org/path  ',
    'HTTPS://EXAMPLE.ORG/PATH',
    'https://www.example.org/path',
    'https://example.org/path/',
  ])('%s 與 https://example.org/path 等價', (input) => {
    expect(analyzed(input).normalizedUrl).toBe('https://example.org/path');
  });

  it('保留連接埠與查詢字串', () => {
    expect(analyzed('https://example.org:8080/a?b=1').normalizedUrl).toBe('https://example.org:8080/a?b=1');
  });
});

describe('完整網址與網域比對', () => {
  it('完整網址在清單中 → 已知惡意，列出每個來源的命中與時間', () => {
    const result = analyzed('https://evil.example/login');
    expect(result).toMatchObject({ verdict: 'known-malicious', match: 'full-url', domainReported: true });
    expect(result.sources).toEqual([
      { source: 'URLhaus', hit: true, lastSeen: '2026-11-18T00:00:00Z' },
      { source: 'OpenPhish', hit: true, lastSeen: '2026-11-15T00:00:00Z' },
    ]);
    expect(result.threats).toEqual(['phishing', 'malware']);
    expect(result.firstSeen).toBe('2026-11-08T00:00:00Z');
    expect(result.lastSeen).toBe('2026-11-18T00:00:00Z');
  });

  it('比對不受格式小差異影響（大小寫、www.、結尾 /、有無 scheme、http 或 https）', () => {
    expect(analyzed('EVIL.example/login/').match).toBe('full-url');
    expect(analyzed('https://phish.example').match).toBe('full-url');
  });

  it('路徑不同但網域被收錄 → 已知惡意（網域相符）', () => {
    expect(analyzed('https://evil.example/other-page')).toMatchObject({
      verdict: 'known-malicious',
      match: 'domain',
      domainReported: true,
    });
  });

  it('不在清單中 → 查無紀錄，所有來源都未命中', () => {
    const result = analyzed('https://example.org');
    expect(result).toMatchObject({
      verdict: 'no-record',
      match: null,
      domainReported: false,
      threats: [],
      firstSeen: null,
      lastSeen: null,
    });
    expect(result.sources).toEqual([
      { source: 'URLhaus', hit: false, lastSeen: null },
      { source: 'OpenPhish', hit: false, lastSeen: null },
    ]);
  });

  it('只是網域名稱相似不算相符', () => {
    expect(analyzed('https://notevil.example/login').verdict).toBe('no-record');
  });
});

describe('共用平台只比對完整網址', () => {
  it('完整網址相符 → 已知惡意，但不算網域被通報', () => {
    expect(analyzed('https://drive.google.com/file/d/bad-file/view')).toMatchObject({
      verdict: 'known-malicious',
      match: 'full-url',
      sharedPlatform: true,
      domainReported: false,
    });
  });

  it('網域被收錄但完整網址不符 → 查無紀錄', () => {
    expect(analyzed('https://drive.google.com/file/d/my-report/view')).toMatchObject({
      verdict: 'no-record',
      sharedPlatform: true,
    });
  });

  it('共用平台的子網域也算共用平台', () => {
    expect(analyzed('https://attacker.github.io/steal').verdict).toBe('known-malicious');
    expect(analyzed('https://attacker.github.io/blog')).toMatchObject({ verdict: 'no-record', sharedPlatform: true });
  });
});

describe('defang 輸出', () => {
  it.each([
    ['https://evil.example/login', 'hxxps://evil[.]example/login'],
    ['evil.example', 'hxxp://evil[.]example'],
    ['https://a.b.example/x.html?y=1.2', 'hxxps://a[.]b[.]example/x.html?y=1.2'],
    ['http://192.168.0.1/admin', 'hxxp://192[.]168[.]0[.]1/admin'],
  ])('%s → %s', (input, defanged) => {
    expect(analyzed(input).defangedUrl).toBe(defanged);
  });

  it('網址拆解：協定、defang 後的網域、路徑', () => {
    expect(analyzed('https://Evil-Login.example:8443/Pay?x=1').parts).toEqual({
      protocol: 'https',
      host: 'evil-login[.]example:8443',
      path: '/pay?x=1',
    });
    expect(analyzed('evil.example').parts.path).toBe('/');
  });

  it('defang 後的網址不是可輸入的網址', () => {
    expect(analyzeUrl(analyzed('https://evil.example/login').defangedUrl, fakeList)).toEqual({ status: 'not-url' });
  });
});
