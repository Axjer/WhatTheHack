import type { KevFile } from './kev';
import { loadJson } from './loadJson';

/** 載入每日更新的 CISA KEV 統計檔 */
export function loadKev(): Promise<KevFile> {
  return loadJson<KevFile>('kev.json');
}
