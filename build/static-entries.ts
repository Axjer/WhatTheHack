/**
 * GitHub Pages 只提供靜態檔案：每個子頁面需要自己的 index.html（直接開啟時回傳 200），
 * 另外用 404.html 讓未知路徑也由 React 處理。回傳相對於輸出資料夾的檔案路徑，內容都是 index.html 的複本。
 */
export function staticEntryFiles(paths: readonly string[]): string[] {
  const pageEntries = paths.filter((path) => path !== '/').map((path) => `${path.slice(1)}/index.html`);
  return ['404.html', ...pageEntries];
}
