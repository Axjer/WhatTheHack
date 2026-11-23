import { loadJson } from './loadJson';
import type { NewsFile } from './news';

/** 載入每日更新的新聞摘要檔 */
export function loadNews(): Promise<NewsFile> {
  return loadJson<NewsFile>('news.json');
}
