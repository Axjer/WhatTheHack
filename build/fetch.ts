/**
 * 每日更新腳本共用的抓取工具：抓文字、讀上一份資料檔。
 * 失敗一律回傳 null，不丟出例外，讓更新腳本沿用上一份、網站照常部署。
 */
import { readFile } from 'node:fs/promises';

const USER_AGENT = 'hack-ni-hao-data-builder';
const TIMEOUT_MS = 60_000;

/** 抓取文字；失敗時回傳 null。log 只印標籤與狀態，不印網址（網址可能含金鑰） */
export async function fetchText(label: string, url: string): Promise<string | null> {
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

/**
 * 讀上一份資料檔：有 previousUrl（目前已部署的網址）就從網站抓，否則讀本機的輸出檔。
 * 格式不符 isValid 或讀取失敗時回傳 null。
 */
export async function readPrevious<T>(
  label: string,
  previousUrl: string | undefined,
  localFile: URL,
  isValid: (value: unknown) => value is T,
): Promise<T | null> {
  try {
    const text = previousUrl ? await fetchText(label, previousUrl) : await readFile(localFile, 'utf8');
    const value: unknown = text ? JSON.parse(text) : null;
    return isValid(value) ? value : null;
  } catch {
    return null;
  }
}
