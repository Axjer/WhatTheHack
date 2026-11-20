import {
  listSources,
  normalizeUrl,
  type ListSource,
  type MaliciousEntry,
  type MaliciousList,
} from '../src/analysis/analyzeUrl.ts';

/**
 * OpenPhish 的 feed 只列出目前仍活著的網址，掉出今天 feed 不代表立刻失效。
 * 掉出後保留 7 天才真正移除清單；URLhaus 本身已經用 url_status 判斷是否在線，不需要這個保留期。
 */
const OPENPHISH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

type BuildInput = {
  /** URLhaus 的 CSV 原始文字；null 表示抓取失敗 */
  urlhausCsv: string | null;
  /** OpenPhish 免費版的純文字（每行一個網址）；null 表示抓取失敗 */
  openphishText: string | null;
  /** 上一份清單；抓取失敗時保留其中該來源的紀錄 */
  previous: MaliciousList | null;
  now: Date;
};

/**
 * 每日資料整理模組：把兩個來源的原始文字合併、去重、正規化成惡意網址清單。
 * 純函式，不連網；抓取與寫檔由 update-malicious-list.ts 負責。
 */
export function buildMaliciousList({ urlhausCsv, openphishText, previous, now }: BuildInput): MaliciousList | null {
  const time = now.toISOString();
  const freshBySource: Record<ListSource, MaliciousEntry[]> = {
    URLhaus: fromUrlhaus(urlhausCsv ?? '', time),
    OpenPhish: fromOpenPhish(openphishText ?? '', time),
  };
  // 抓不到或解析不出任何網址（例如拿到錯誤頁）都算失敗：不能讓這個來源變成空的
  const succeeded = listSources.filter((source) => freshBySource[source].length > 0);
  if (!succeeded.length) return previous;

  const previousEntries = previous?.entries ?? [];
  const entries: MaliciousEntry[] = [];
  const sourceUpdatedAt = {} as MaliciousList['sourceUpdatedAt'];
  for (const source of listSources) {
    const fresh = freshBySource[source];
    const previousOfSource = previousEntries.filter((entry) => entry.source === source);
    if (fresh.length) {
      const freshKeys = new Set(fresh.map(keyOf));
      const retentionMs = source === 'OpenPhish' ? OPENPHISH_RETENTION_MS : 0;
      const carried = previousOfSource.filter(
        (entry) =>
          // 今天的 feed 裡還在：一起去重，沿用較早的首次發現時間（OpenPhish 不提供時間）
          freshKeys.has(keyOf(entry)) ||
          // 掉出今天的 feed，但還在保留期內：原本的發現時間不變
          now.getTime() - Date.parse(entry.lastSeen) <= retentionMs,
      );
      pushAll(entries, fresh);
      pushAll(entries, carried);
      sourceUpdatedAt[source] = time;
    } else {
      // 失敗的來源沿用上一份的紀錄與更新時間
      pushAll(entries, previousOfSource);
      sourceUpdatedAt[source] = previous?.sourceUpdatedAt[source] ?? null;
    }
  }

  const merged = dedupe(entries);
  merged.sort((a, b) => a.url.localeCompare(b.url) || a.source.localeCompare(b.source));
  return { sourceUpdatedAt, entries: merged };
}

/**
 * 逐筆加入陣列，取代 `target.push(...source)`：來源數量很大時（URLhaus 動輒十萬筆），
 * 展開運算子會把整個陣列當成呼叫參數，超過引擎對參數數量的上限而丟出
 * RangeError: Maximum call stack size exceeded。
 */
function pushAll<T>(target: T[], source: readonly T[]): void {
  for (const item of source) target.push(item);
}

/** 同一來源的同一網址視為同一筆紀錄 */
function keyOf(entry: MaliciousEntry): string {
  return `${entry.source} ${entry.url}`;
}

/** 同一來源的同一網址只留一筆：首次發現取最早、最後發現取最晚 */
function dedupe(entries: MaliciousEntry[]): MaliciousEntry[] {
  const byKey = new Map<string, MaliciousEntry>();
  for (const entry of entries) {
    const key = keyOf(entry);
    const seen = byKey.get(key);
    byKey.set(
      key,
      seen
        ? {
            ...seen,
            firstSeen: entry.firstSeen < seen.firstSeen ? entry.firstSeen : seen.firstSeen,
            lastSeen: entry.lastSeen > seen.lastSeen ? entry.lastSeen : seen.lastSeen,
          }
        : entry,
    );
  }
  return [...byKey.values()];
}

function fromOpenPhish(text: string, time: string): MaliciousEntry[] {
  const entries: MaliciousEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    const url = normalizeUrl(line);
    if (url) entries.push({ url, source: 'OpenPhish', threat: 'phishing', firstSeen: time, lastSeen: time });
  }
  return entries;
}

/** URLhaus CSV 的欄位（檔案開頭的 `# id,dateadded,...` 註解列會覆蓋這個預設順序） */
const URLHAUS_COLUMNS = ['id', 'dateadded', 'url', 'url_status', 'last_online', 'threat', 'tags', 'urlhaus_link', 'reporter'];

function fromUrlhaus(csv: string, time: string): MaliciousEntry[] {
  let columns = URLHAUS_COLUMNS;
  const entries: MaliciousEntry[] = [];
  for (const line of csv.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (line.startsWith('#')) {
      const header = line.slice(1).trim();
      if (header.startsWith('id,')) columns = header.split(',');
      continue;
    }
    const fields = parseCsvLine(line);
    const row = Object.fromEntries(columns.map((column, i) => [column, fields[i] ?? '']));
    // 只收目前仍在線上的網址：已下線的網址點了也不會中毒，且能讓清單保持精簡
    if (row.url_status !== 'online') continue;
    const url = normalizeUrl(row.url);
    if (!url) continue;
    entries.push({
      url,
      source: 'URLhaus',
      threat: 'malware',
      firstSeen: urlhausTime(row.dateadded) ?? time,
      lastSeen: urlhausTime(row.last_online) ?? time,
    });
  }
  return entries;
}

/** URLhaus 的時間是 UTC 的 `YYYY-MM-DD HH:MM:SS` */
function urlhausTime(text: string): string | null {
  const date = new Date(`${text.trim().replace(' ', 'T')}Z`);
  return text.trim() && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

/** 解析一列 CSV：欄位可用雙引號包住（內含逗號），`""` 代表一個雙引號 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}
