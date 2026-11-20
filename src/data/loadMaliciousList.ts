import type { MaliciousList } from '../analysis/analyzeUrl';

/**
 * 載入惡意網址清單。只下載清單檔，使用者輸入的網址不會送出：比對全部在瀏覽器內完成。
 */
export async function loadMaliciousList(): Promise<MaliciousList> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/malicious-urls.json`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as MaliciousList;
}
