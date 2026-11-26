/**
 * 首頁數據卡用的小型統計檔，每日由 build/update-malicious-list.ts 和清單一起產生。
 * 首頁只需要筆數，不必下載整份惡意網址清單（可能有數 MB）。
 */
export type StatsFile = {
  /** 惡意網址清單的筆數 */
  maliciousUrlCount: number;
};
