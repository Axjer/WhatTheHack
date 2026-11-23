import type { NewsFile } from './news';

/** 載入每日更新的新聞摘要檔 */
export async function loadNews(): Promise<NewsFile> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/news.json`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as NewsFile;
}
