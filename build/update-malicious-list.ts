/**
 * 每日更新惡意網址清單：抓取 URLhaus 與 OpenPhish，整理後寫到 public/data/malicious-urls.json。
 * 由部署 workflow 在 build 前執行（`npm run update-list`）。
 *
 * 環境變數：
 * - URLHAUS_AUTH_KEY：abuse.ch 的 Auth-Key（GitHub Secret）。沒有時 URLhaus 視為抓取失敗。
 * - PREVIOUS_LIST_URL：目前已部署的清單網址，作為「上一份清單」。沒有時改讀本機的輸出檔。
 *
 * 任何來源失敗都不會讓這個腳本失敗：失敗的來源沿用上一份清單，網站照常部署。
 */
import { readFile, writeFile } from 'node:fs/promises';
import { listSources, type MaliciousList } from '../src/analysis/analyzeUrl.ts';
import { buildMaliciousList } from './malicious-list.ts';

const OUTPUT = new URL('../public/data/malicious-urls.json', import.meta.url);
const OPENPHISH_URL = 'https://openphish.com/feed.txt';
const USER_AGENT = 'hack-ni-hao-list-builder';
const TIMEOUT_MS = 60_000;

/** 抓取文字；失敗時回傳 null。不印出網址：URLhaus 的網址含 Auth-Key */
async function fetchText(label: string, url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn(`${label}：抓取失敗（HTTP ${response.status}）`);
      return null;
    }
    return await response.text();
  } catch (error) {
    console.warn(`${label}：抓取失敗（${error instanceof Error ? error.name : 'unknown error'}）`);
    return null;
  }
}

function fetchUrlhaus(): Promise<string | null> {
  const key = process.env.URLHAUS_AUTH_KEY?.trim();
  if (!key) {
    console.warn('URLhaus：沒有設定 URLHAUS_AUTH_KEY，沿用上一份清單');
    return Promise.resolve(null);
  }
  return fetchText('URLhaus', `https://urlhaus-api.abuse.ch/v2/files/exports/${encodeURIComponent(key)}/recent.csv`);
}

function isMaliciousList(value: unknown): value is MaliciousList {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as MaliciousList).sourceUpdatedAt === 'object' &&
    (value as MaliciousList).sourceUpdatedAt !== null &&
    Array.isArray((value as MaliciousList).entries)
  );
}

async function readPrevious(): Promise<MaliciousList | null> {
  const previousUrl = process.env.PREVIOUS_LIST_URL;
  try {
    const text = previousUrl ? await fetchText('上一份清單', previousUrl) : await readFile(OUTPUT, 'utf8');
    const value: unknown = text ? JSON.parse(text) : null;
    return isMaliciousList(value) ? value : null;
  } catch {
    return null;
  }
}

const [urlhausCsv, openphishText, previous] = await Promise.all([
  fetchUrlhaus(),
  fetchText('OpenPhish', OPENPHISH_URL),
  readPrevious(),
]);

const list = buildMaliciousList({ urlhausCsv, openphishText, previous, now: new Date() });

if (!list) {
  console.warn('兩個來源都失敗，也沒有上一份清單：保留現有檔案，不覆蓋');
} else {
  await writeFile(OUTPUT, `${JSON.stringify(list)}\n`);
  console.log(`惡意網址清單：共 ${list.entries.length} 筆`);
  for (const source of listSources) {
    const count = list.entries.filter((entry) => entry.source === source).length;
    console.log(`- ${source}：${count} 筆，更新於 ${list.sourceUpdatedAt[source] ?? '（從未成功更新）'}`);
  }
}
