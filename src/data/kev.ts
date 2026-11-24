/** 趨勢圖的天數（近 7 天）：每日統計與頁面文案共用 */
export const KEV_WINDOW_DAYS = 7;

/** 某一天新增的已被利用漏洞筆數 */
export type KevDay = {
  /** CISA 收錄的日期 YYYY-MM-DD（美國日期） */
  date: string;
  count: number;
};

/**
 * 隨網站部署的 CISA 已被利用漏洞清單（KEV）統計檔，每日由 build/update-kev.ts 產生，給最新情資頁的趨勢圖使用。
 * 只存每天的筆數，不存 CVE 編號與 CVSS 分數。
 */
export type KevFile = {
  /** 最近一次成功更新的時間（ISO 8601）；從未更新為 null */
  updatedAt: string | null;
  /** 近 7 天（含當天）每天新增的筆數，由舊到新 */
  daily: KevDay[];
  /**
   * CISA 官方來源從什麼時候開始抓不到（ISO 8601）；抓得到時為 null。
   * 只給每日更新流程判斷是否已連續兩天抓不到、該改抓 GitHub 上的官方副本，頁面不使用。
   */
  cisaFailedSince?: string | null;
};
