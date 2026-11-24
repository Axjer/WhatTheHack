/**
 * 每日更新 CISA KEV（已遭駭客利用的漏洞目錄）統計：過去 7 天新增的數量與受影響最多的廠商，
 * 寫到 public/data/kev.json，給最新情資頁的白話橫幅使用。由部署 workflow 在 build 前執行（`npm run update-kev`）。
 *
 * 環境變數：
 * - PREVIOUS_KEV_URL：目前已部署的統計檔網址，作為「上一份」。沒有時改讀本機的輸出檔。
 *
 * 任何失敗都不會讓這個腳本失敗：抓取失敗時沿用上一份，網站照常部署。
 */
import { writeFile } from 'node:fs/promises';
import type { KevFile } from '../src/data/kev.ts';
import { fetchText, readPrevious } from './fetch.ts';
import { summarizeKev } from './kev.ts';

const OUTPUT = new URL('../public/data/kev.json', import.meta.url);
/** CISA 官方來源；CISA 網站偶爾擋自動化請求，失敗時改抓 CISA 在 GitHub 上的官方鏡像 */
const SOURCES = [
  { label: 'CISA KEV', url: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json' },
  {
    label: 'CISA KEV（GitHub 鏡像）',
    url: 'https://raw.githubusercontent.com/cisagov/kev-data/main/known_exploited_vulnerabilities.json',
  },
];

function isKevFile(value: unknown): value is KevFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as KevFile).added === 'number' &&
    Array.isArray((value as KevFile).topVendors)
  );
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const now = new Date();
let kev: KevFile | null = null;
for (const { label, url } of SOURCES) {
  const text = await fetchText(label, url);
  kev = text ? summarizeKev(parseJson(text), now) : null;
  if (kev) break;
  if (text) console.warn(`${label}：格式不符`);
}

if (kev) {
  await writeFile(OUTPUT, `${JSON.stringify(kev)}\n`);
  console.log(`KEV：過去 7 天新增 ${kev.added} 個，主要廠商：${kev.topVendors.join('、') || '（無）'}`);
} else {
  const previous = await readPrevious('上一份 KEV 統計檔', process.env.PREVIOUS_KEV_URL, OUTPUT, isKevFile);
  if (previous) {
    await writeFile(OUTPUT, `${JSON.stringify(previous)}\n`);
    console.warn(`KEV 抓取失敗：沿用上一份（更新於 ${previous.updatedAt ?? '從未更新'}）`);
  } else {
    console.warn('KEV 抓取失敗，也沒有上一份：保留現有檔案，不覆蓋');
  }
}
