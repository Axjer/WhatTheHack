/** 一篇新聞的 AI 白話摘要 */
export type NewsSummary = {
  /** 白話中文標題 */
  headline: string;
  /** 2–3 句白話中文摘要 */
  summary: string;
};

export type NewsItem = NewsSummary & {
  /** 原文標題（英文） */
  title: string;
  /** 原文網址 */
  url: string;
  /** 原文發布時間（ISO 8601） */
  publishedAt: string;
};

/** 隨網站部署的新聞摘要檔（每日由 build/update-news.ts 產生） */
export type NewsFile = {
  /** 最近一次成功更新的時間（ISO 8601）；從未更新為 null */
  updatedAt: string | null;
  /** 由新到舊 */
  items: NewsItem[];
};
