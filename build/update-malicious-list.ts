/**
 * 每日更新惡意網址清單：抓取 URLhaus 與 OpenPhish，整理後寫到 public/data/malicious-urls.json，
 * 並把筆數寫到 public/data/stats.json（首頁數據卡用）。
 * 由部署 workflow 在 build 前執行（`npm run update-list`）。
 *
 * 環境變數：
 * - URLHAUS_AUTH_KEY：abuse.ch 的 Auth-Key（GitHub Secret）。沒有時 URLhaus 視為抓取失敗。
 * - PREVIOUS_LIST_URL：目前已部署的清單網址，作為「上一份清單」。沒有時改讀本機的輸出檔。
 *
 * 任何來源失敗都不會讓這個腳本失敗：失敗的來源沿用上一份清單，網站照常部署。
 */
import { writeFile } from 'node:fs/promises';
import { listSources, type MaliciousList } from '../src/analysis/analyzeUrl.ts';
import type { StatsFile } from '../src/data/stats.ts';
import { fetchText, readPrevious } from './fetch.ts';
import { buildMaliciousList } from './malicious-list.ts';

const OUTPUT = new URL('../public/data/malicious-urls.json', import.meta.url);
/** 首頁數據卡只讀這個小檔，不下載整份清單 */
const STATS_OUTPUT = new URL('../public/data/stats.json', import.meta.url);
const OPENPHISH_URL = 'https://openphish.com/feed.txt';

/**
 * 抓 URLhaus 的 online.csv：目前仍在線上的惡意網址，不限收錄時間。
 * 不用 recent.csv（只收近 30 天新增）：超過 30 天但仍在散布惡意程式的網址會被漏掉（#32）。
 * 不印出網址：URLhaus 的網址含 Auth-Key（fetchText 只印標籤與狀態）。
 */
function fetchUrlhaus(): Promise<string | null> {
  const key = process.env.URLHAUS_AUTH_KEY?.trim();
  if (!key) {
    console.warn('URLhaus：沒有設定 URLHAUS_AUTH_KEY，沿用上一份清單');
    return Promise.resolve(null);
  }
  return fetchText('URLhaus', `https://urlhaus-api.abuse.ch/v2/files/exports/${encodeURIComponent(key)}/online.csv`);
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

const [urlhausCsv, openphishText, previous] = await Promise.all([
  fetchUrlhaus(),
  fetchText('OpenPhish', OPENPHISH_URL),
  readPrevious('上一份清單', process.env.PREVIOUS_LIST_URL, OUTPUT, isMaliciousList),
]);

const list = buildMaliciousList({ urlhausCsv, openphishText, previous, now: new Date() });

if (!list) {
  console.warn('兩個來源都失敗，也沒有上一份清單：保留現有檔案，不覆蓋');
} else {
  await writeFile(OUTPUT, `${JSON.stringify(list)}\n`);
  const stats: StatsFile = { maliciousUrlCount: list.entries.length };
  await writeFile(STATS_OUTPUT, `${JSON.stringify(stats)}\n`);
  console.log(`惡意網址清單：共 ${list.entries.length} 筆`);
  for (const source of listSources) {
    const count = list.entries.filter((entry) => entry.source === source).length;
    console.log(`- ${source}：${count} 筆，更新於 ${list.sourceUpdatedAt[source] ?? '（從未成功更新）'}`);
  }
}
