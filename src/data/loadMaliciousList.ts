import type { MaliciousEntry } from '../analysis/analyzeUrl';

/** 隨網站部署的惡意網址清單檔（每日由 build/update-malicious-list.ts 產生） */
export type MaliciousList = {
  /** 最近一次成功更新的時間（ISO 8601） */
  updatedAt: string;
  entries: MaliciousEntry[];
};

/**
 * 載入惡意網址清單。只下載清單檔，使用者輸入的網址不會送出：比對全部在瀏覽器內完成。
 */
export async function loadMaliciousList(): Promise<MaliciousList> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/malicious-urls.json`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as MaliciousList;
}
