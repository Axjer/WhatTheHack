import type { MaliciousList } from '../analysis/analyzeUrl';
import { loadJson } from './loadJson';

/** 載入每日更新的惡意網址清單 */
export function loadMaliciousList(): Promise<MaliciousList> {
  return loadJson<MaliciousList>('malicious-urls.json');
}
