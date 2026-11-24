/**
 * 每日更新 CISA 已被利用漏洞清單（KEV）統計：近 7 天每天新增的筆數，
 * 寫到 public/data/kev.json，給最新情資頁的趨勢圖使用。由部署 workflow 在 build 前執行（`npm run update-kev`）。
 *
 * 環境變數：
 * - PREVIOUS_KEV_URL：目前已部署的統計檔網址，作為「上一份」。沒有時改讀本機的輸出檔。
 *
 * 任何失敗都不會讓這個腳本失敗：CISA 抓不到的第一天沿用上一份，連續第二天改抓 GitHub 上的官方副本（見 updateKev）。
 */
import { writeFile } from 'node:fs/promises';
import { KEV_WINDOW_DAYS, type KevFile } from '../src/data/kev.ts';
import { fetchText, readPrevious } from './fetch.ts';
import { updateKev } from './kev.ts';

const OUTPUT = new URL('../public/data/kev.json', import.meta.url);
const CISA_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const MIRROR_URL = 'https://raw.githubusercontent.com/cisagov/kev-data/main/known_exploited_vulnerabilities.json';

function isKevFile(value: unknown): value is KevFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as KevFile).daily)
  );
}

/** 抓 JSON；抓取或解析失敗時回傳 null */
async function fetchJson(label: string, url: string): Promise<unknown> {
  const text = await fetchText(label, url);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    console.warn(`${label}：格式不符`);
    return null;
  }
}

const previous = await readPrevious('上一份 KEV 統計檔', process.env.PREVIOUS_KEV_URL, OUTPUT, isKevFile);
const kev = await updateKev({
  fetchCisa: () => fetchJson('CISA KEV', CISA_URL),
  fetchMirror: () => fetchJson('CISA KEV（GitHub 官方副本）', MIRROR_URL),
  previous,
  now: new Date(),
});

if (!kev) {
  console.warn('KEV 抓取失敗，也沒有上一份：保留現有檔案，不覆蓋');
} else {
  await writeFile(OUTPUT, `${JSON.stringify(kev)}\n`);
  if (kev.cisaFailedSince) console.warn(`CISA KEV 自 ${kev.cisaFailedSince} 起抓不到`);
  const days = kev.daily.map(({ date, count }) => `${date.slice(5)} ${count}`).join('、');
  console.log(
    `KEV（更新於 ${kev.updatedAt}）：近 ${KEV_WINDOW_DAYS} 天每日新增 ${days}`,
  );
}
