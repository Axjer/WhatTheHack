/**
 * 載入隨網站部署的 JSON 資料檔（public/data/ 底下）。
 * 只下載資料檔；使用者輸入的網址不會送出，比對全部在瀏覽器內完成。
 */
export async function loadJson<T>(fileName: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${fileName}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}
