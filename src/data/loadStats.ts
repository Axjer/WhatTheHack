import { loadJson } from './loadJson';
import type { StatsFile } from './stats';

/** 載入首頁數據卡的統計檔 */
export function loadStats(): Promise<StatsFile> {
  return loadJson<StatsFile>('stats.json');
}
