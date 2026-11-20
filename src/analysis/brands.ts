/**
 * 台灣常見品牌（警訊：網域裡有品牌名稱，卻不是該品牌的官方網域）。
 *
 * - keywords：一律小寫。5 個字元以上的關鍵字只要出現在網域中就算（如 `shopee-tw.vip`）；
 *   較短的關鍵字必須是網域中以 `.` 或 `-` 分隔的完整一段（避免 `line` 誤中 `online`）。
 * - officialDomains：官方網域，本身與子網域都不算仿冒。
 * - officialPattern：官方網域的規則（例如各國政府網域），補足 officialDomains 列不完的情況。
 */
export type Brand = {
  name: string;
  keywords: readonly string[];
  officialDomains: readonly string[];
  officialPattern?: RegExp;
};

export const brands: readonly Brand[] = [
  // 政府機關：任何以 .gov 或 .gov.<國碼> 結尾的網域都是政府網域
  { name: '政府機關', keywords: ['gov', 'govtw'], officialDomains: [], officialPattern: /(^|\.)gov(\.[a-z]{2})?$/ },
  { name: '監理服務網', keywords: ['mvdis'], officialDomains: ['mvdis.gov.tw'] },
  { name: '中華郵政', keywords: ['chunghwapost', 'postgov', 'twpost'], officialDomains: ['post.gov.tw'] },
  // 通訊與購物
  { name: 'LINE', keywords: ['line'], officialDomains: ['line.me', 'line.biz', 'linecorp.com', 'line-apps.com', 'line-scdn.net'] },
  { name: '蝦皮', keywords: ['shopee'], officialDomains: ['shopee.tw', 'shopee.com', 'shopeemobile.com'] },
  { name: 'momo 購物', keywords: ['momoshop'], officialDomains: ['momoshop.com.tw'] },
  // 銀行
  { name: '台灣銀行', keywords: ['bankoftaiwan'], officialDomains: ['bot.com.tw'] },
  { name: '中國信託', keywords: ['ctbc', 'ctbcbank'], officialDomains: ['ctbcbank.com', 'ctbcbank.com.tw'] },
  { name: '國泰世華', keywords: ['cathaybk'], officialDomains: ['cathaybk.com.tw', 'cathaybk.com'] },
  { name: '玉山銀行', keywords: ['esun', 'esunbank'], officialDomains: ['esunbank.com.tw', 'esunbank.com'] },
  { name: '台新銀行', keywords: ['taishin', 'taishinbank'], officialDomains: ['taishinbank.com.tw', 'richart.tw'] },
  { name: '富邦銀行', keywords: ['fubon', 'taipeifubon'], officialDomains: ['fubon.com', 'taipeifubon.com.tw'] },
  { name: '永豐銀行', keywords: ['sinopac'], officialDomains: ['sinopac.com'] },
  { name: '兆豐銀行', keywords: ['megabank'], officialDomains: ['megabank.com.tw'] },
  { name: '第一銀行', keywords: ['firstbank'], officialDomains: ['firstbank.com.tw'] },
  { name: '合作金庫', keywords: ['tcbbank', 'tcb-bank'], officialDomains: ['tcb-bank.com.tw'] },
];
