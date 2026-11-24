/** 過去 7 天的範圍：橫幅文案與每日統計共用 */
export const KEV_WINDOW_DAYS = 7;

/**
 * 隨網站部署的 CISA KEV（已遭駭客利用的漏洞目錄）統計檔，每日由 build/update-kev.ts 產生。
 * 只存白話橫幅需要的數字與廠商名，不存 CVE 編號與 CVSS 分數。
 */
export type KevFile = {
  /** 最近一次成功更新的時間（ISO 8601）；從未更新為 null */
  updatedAt: string | null;
  /** 過去 7 天新增的漏洞數 */
  added: number;
  /** 受影響最多的廠商（最多兩個），依次數由多到少 */
  topVendors: string[];
  /**
   * CISA 官方來源從什麼時候開始抓不到（ISO 8601）；抓得到時為 null。
   * 只給每日更新流程判斷是否已連續兩天抓不到、該改抓 GitHub 上的官方副本，頁面不使用。
   */
  cisaFailedSince?: string | null;
};
