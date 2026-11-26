/** 清單涵蓋的天數（近 30 天，含當天）：每日統計與頁面文案共用 */
export const KEV_WINDOW_DAYS = 30;

/** 近期正被攻擊的一項軟體或設備：同一產品的漏洞合併成一項 */
export type KevProduct = {
  /** CISA 的英文原名「廠商 產品」；產品名已含廠商名時不重複，例如「Microsoft Windows」「Google Chrome」 */
  name: string;
  /** 近 30 天收錄了幾個這項產品的漏洞 */
  count: number;
  /** 最近一次收錄的日期 YYYY-MM-DD（CISA 的美東日期） */
  latestDate: string;
  /** 任一漏洞已被 CISA 標為勒索軟體已利用 */
  ransomware: boolean;
};

/**
 * 隨網站部署的 CISA 已被利用漏洞清單（KEV）統計檔，每日由 build/update-kev.ts 產生，給最新情資頁的「最近正被攻擊的軟體」使用。
 * 不存 CVE 編號、CVSS 分數與 CISA 的英文描述。
 */
export type KevFile = {
  /** 最近一次成功更新的時間（ISO 8601）；從未更新為 null */
  updatedAt: string | null;
  /** 近 30 天正被攻擊的產品：一般人常用的軟體在前，前後兩段各自依最近收錄日期由新到舊（排序見 build/kev.ts） */
  products: KevProduct[];
  /**
   * CISA 官方來源從什麼時候開始抓不到（ISO 8601）；抓得到時為 null。
   * 只給每日更新流程判斷是否已連續兩天抓不到、該改抓 GitHub 上的官方副本，頁面不使用。
   */
  cisaFailedSince?: string | null;
};
