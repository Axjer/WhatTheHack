import { sharedPlatforms } from './sharedPlatforms';
import { urlShorteners } from './urlShorteners';

/** 惡意網址清單的來源（每日由 GitHub Actions 合併） */
export const listSources = ['URLhaus', 'OpenPhish'] as const;
export type ListSource = (typeof listSources)[number];

/** 來源標記的威脅類型；陣列順序即顯示順序 */
export const threats = ['phishing', 'malware'] as const;
export type Threat = (typeof threats)[number];

/** 惡意網址清單的一筆紀錄；時間為 ISO 8601 */
export type MaliciousEntry = {
  url: string;
  source: ListSource;
  threat: Threat;
  firstSeen: string;
  lastSeen: string;
};

/** 判定結果（見 GLOSSARY.md） */
export type Verdict = 'known-malicious' | 'suspicious' | 'no-record';

/** 三項警訊（見 GLOSSARY.md）：直接使用 IP 位址、短網址服務、網址中含 @ */
export type WarningSign = 'ip-address' | 'url-shortener' | 'at-sign';

/** 在惡意網址清單中相符的方式；null 表示不在清單中 */
export type ListMatch = 'full-url' | 'domain' | null;

export type SourceResult = { source: ListSource; hit: boolean; lastSeen: string | null };

export type UrlAnalysis = {
  status: 'analyzed';
  verdict: Verdict;
  match: ListMatch;
  /** 網域屬於共用平台：只比對完整網址 */
  sharedPlatform: boolean;
  /** 同一個網域有網址被收錄（共用平台一律為 false） */
  domainReported: boolean;
  /** 正規化後的網址：小寫、去除 `www.`、補 scheme、去除結尾 `/` */
  normalizedUrl: string;
  /** defang 後的網址，畫面上一律顯示這個 */
  defangedUrl: string;
  /** 網址拆解；網域已 defang，路徑含查詢字串 */
  parts: { protocol: 'http' | 'https'; host: string; path: string };
  /** 每個來源是否命中，依 listSources 的順序 */
  sources: SourceResult[];
  /** 命中紀錄標記的威脅類型，依 threats 的順序 */
  threats: Threat[];
  /** 符合的警訊，依 IP 位址、短網址、@ 的順序；已知惡意時也會列出 */
  warningSigns: WarningSign[];
  firstSeen: string | null;
  lastSeen: string | null;
};

/** 整個輸入不是單一網址：畫面顯示「請輸入網址」，不給燈號 */
export type AnalysisResult = { status: 'not-url' } | UrlAnalysis;

/**
 * 網址分析模組的唯一入口：驗證輸入、正規化、與惡意網址清單比對、檢查警訊並給出判定結果。
 * 判定順序：惡意網址清單 → 警訊 → 查無紀錄。
 * 純函式，全部在瀏覽器內完成，不發出任何網路請求。
 */
export function analyzeUrl(input: string, maliciousList: readonly MaliciousEntry[]): AnalysisResult {
  const url = parseSingleUrl(input);
  if (!url) return { status: 'not-url' };

  const sharedPlatform = isUnder(url.hostname, sharedPlatforms);
  const shortener = isUnder(url.hostname, urlShorteners);
  // 共用平台與短網址：任何人都能建立網址，只比對完整網址
  const fullUrlOnly = sharedPlatform || shortener;
  const index = indexOf(maliciousList);
  const urlHits = index.byUrl.get(url.matchKey) ?? [];
  const domainHits = fullUrlOnly ? [] : (index.byDomain.get(url.hostname) ?? []);
  const match: ListMatch = urlHits.length ? 'full-url' : domainHits.length ? 'domain' : null;
  const hits = urlHits.length ? urlHits : domainHits;
  const warningSigns = warningSignsOf(url, shortener);

  return {
    status: 'analyzed',
    verdict: match ? 'known-malicious' : warningSigns.length ? 'suspicious' : 'no-record',
    match,
    sharedPlatform,
    domainReported: domainHits.length > 0,
    normalizedUrl: url.normalized,
    defangedUrl: url.defanged,
    parts: url.parts,
    sources: listSources.map((source) => {
      const fromSource = hits.filter((entry) => entry.source === source);
      return { source, hit: fromSource.length > 0, lastSeen: latest(fromSource.map((entry) => entry.lastSeen)) };
    }),
    threats: threats.filter((threat) => hits.some((entry) => entry.threat === threat)),
    warningSigns,
    firstSeen: earliest(hits.map((entry) => entry.firstSeen)),
    lastSeen: latest(hits.map((entry) => entry.lastSeen)),
  };
}

function warningSignsOf(url: ParsedUrl, shortener: boolean): WarningSign[] {
  const signs: WarningSign[] = [];
  if (isIpHost(url.hostname)) signs.push('ip-address');
  if (shortener) signs.push('url-shortener');
  // 只看網域前的 @（user@host）：瀏覽器會忽略 @ 前面的文字，路徑裡的 @ 不影響連到哪裡
  if (url.hasUserinfo) signs.push('at-sign');
  return signs;
}

function earliest(times: string[]): string | null {
  return times.length ? times.reduce((a, b) => (Date.parse(b) < Date.parse(a) ? b : a)) : null;
}

function latest(times: string[]): string | null {
  return times.length ? times.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a)) : null;
}

type ParsedUrl = {
  hostname: string;
  normalized: string;
  /** 比對完整網址用：不含 scheme，讓 http 與 https 視為同一個網址 */
  matchKey: string;
  defanged: string;
  parts: UrlAnalysis['parts'];
  /** 網域前有 user@ */
  hasUserinfo: boolean;
};

/** 已 defang 的寫法：hxxp、[.]、(.)、{.}、[:]、[dot] */
const DEFANGED = /hxxps?|\[\.\]|\(\.\)|\{\.\}|\[:\]|\[dot\]/i;
const SCHEME = /^([a-z][a-z0-9+.-]*):\/\//i;
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const HAN = /\p{Script=Han}/u;

/** 整個輸入（去除前後空白）必須是單一 http(s) 網址，否則回傳 null */
function parseSingleUrl(input: string): ParsedUrl | null {
  const text = input.trim();
  // 空白（含換行）代表是一段訊息或多個網址
  if (!text || /\s/.test(text) || DEFANGED.test(text)) return null;

  const scheme = SCHEME.exec(text)?.[1].toLowerCase();
  if (scheme !== undefined && scheme !== 'http' && scheme !== 'https') return null;
  const withScheme = scheme ? text : `http://${text}`;

  // 先檢查原文的 authority：URL 解析器會把 3.14 之類的字串「修正」成 IP
  const authority = /^[^:]+:\/\/([^/?#]*)/.exec(withScheme)?.[1] ?? '';
  // 沒有 scheme 卻有 @：是 email，不是網址
  if (!scheme && authority.includes('@')) return null;
  const rawHost = authority.slice(authority.lastIndexOf('@') + 1);
  // 結尾是冒號（埠號空白）：多半是兩個網址黏在一起，如 a.comhttps://b.com
  if (rawHost.endsWith(':')) return null;
  if (!isValidRawHost(rawHost.replace(/:\d+$/, ''))) return null;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (!isValidHostname(url.hostname)) return null;

  const protocol = url.protocol === 'https:' ? 'https' : 'http';
  const hostname = url.hostname.replace(/^www\./, '');
  const userinfo = (url.username ? `${url.username}${url.password ? `:${url.password}` : ''}@` : '').toLowerCase();
  const host = url.port ? `${hostname}:${url.port}` : hostname;
  const path = `${url.pathname.replace(/\/+$/, '')}${url.search}${url.hash}`.toLowerCase();
  const defangedHost = host.replaceAll('.', '[.]');

  return {
    hostname,
    normalized: `${protocol}://${userinfo}${host}${path}`,
    // 不含 user@：瀏覽器實際連到的網址不包括 @ 前面的文字
    matchKey: `${host}${path}`,
    defanged: `${protocol.replace('http', 'hxxp')}://${userinfo}${defangedHost}${path}`,
    parts: { protocol, host: defangedHost, path: path || '/' },
    hasUserinfo: userinfo !== '',
  };
}

/** 原文的主機名稱：純數字時必須是完整的 IPv4；同一段不能中文和英數字黏在一起（例如「看這個evil.com」） */
function isValidRawHost(rawHost: string): boolean {
  if (rawHost.startsWith('[')) return true; // IPv6，交給 URL 解析器
  if (/^[\d.]+$/.test(rawHost)) return isIpv4(rawHost);
  return rawHost.split('.').every((label) => !(HAN.test(label) && /[a-z0-9]/i.test(label)));
}

/** 解析後的主機名稱：IPv4、IPv6，或至少兩段、最後一段是字母（或 Punycode）的網域 */
function isValidHostname(hostname: string): boolean {
  if (isIpHost(hostname)) return true;
  const labels = hostname.split('.');
  if (labels.length < 2 || labels.some((label) => !/^[a-z0-9-]+$/.test(label))) return false;
  return /^([a-z]{2,}|xn--[a-z0-9-]+)$/.test(labels[labels.length - 1]);
}

/** 解析後的主機名稱是 IP 位址（IPv4，或以 [ 開頭的 IPv6） */
function isIpHost(hostname: string): boolean {
  return hostname.startsWith('[') || isIpv4(hostname);
}

function isIpv4(text: string): boolean {
  const octets = IPV4.exec(text);
  return !!octets && octets.slice(1).every((octet) => Number(octet) <= 255);
}

/** hostname 是清單中的某個網域，或是它的子網域 */
function isUnder(hostname: string, domains: readonly string[]): boolean {
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

type ListIndex = { byUrl: Map<string, MaliciousEntry[]>; byDomain: Map<string, MaliciousEntry[]> };

/** 惡意網址清單的比對索引；同一份清單只建一次 */
const indexCache = new WeakMap<readonly MaliciousEntry[], ListIndex>();

function indexOf(list: readonly MaliciousEntry[]): ListIndex {
  let index = indexCache.get(list);
  if (!index) {
    index = { byUrl: new Map(), byDomain: new Map() };
    for (const entry of list) {
      const url = parseSingleUrl(entry.url);
      if (!url) continue;
      push(index.byUrl, url.matchKey, entry);
      push(index.byDomain, url.hostname, entry);
    }
    indexCache.set(list, index);
  }
  return index;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const values = map.get(key);
  if (values) values.push(value);
  else map.set(key, [value]);
}
