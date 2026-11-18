/** 網站的四個頁面，依導覽列順序排列 */
export const pages = [
  { path: '/', label: '首頁' },
  { path: '/analyze', label: '網址分析' },
  { path: '/intel', label: '最新情資' },
  { path: '/about', label: '來源與說明' },
] as const;

export type PagePath = (typeof pages)[number]['path'];
