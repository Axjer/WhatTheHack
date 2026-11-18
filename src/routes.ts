/** 網站的四個頁面，依導覽列順序排列。vite.config.ts 也用這份清單為每個頁面產生靜態入口。 */
export const pages = [
  { path: '/', label: '首頁' },
  { path: '/analyze', label: '網址分析' },
  { path: '/intel', label: '最新情資' },
  { path: '/about', label: '來源與說明' },
] as const;
