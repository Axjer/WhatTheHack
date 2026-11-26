/**
 * 載入隨網站部署的 JSON 資料檔（public/data/ 底下）。
 * 只下載資料檔；使用者輸入的網址不會送出，比對全部在瀏覽器內完成。
 *
 * cache: 'no-cache'：GitHub Pages 讓瀏覽器快取 10 分鐘，部署後新版程式可能配上快取裡的舊資料檔
 * （例如缺少新欄位）。每次先向伺服器確認，檔案沒變只會回 304，不會重新下載。
 */
export async function loadJson<T>(fileName: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${fileName}`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}
