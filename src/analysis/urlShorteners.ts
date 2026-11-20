/**
 * 短網址服務的網域（警訊：看不出真正會連到哪裡）。
 * 列出的網域本身與它的所有子網域都算。一律小寫、不含 `www.`。
 * 短網址也是任何人都能建立的，所以和共用平台一樣只比對完整網址。
 */
export const urlShorteners: readonly string[] = [
  // 國際常見
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'is.gd',
  'v.gd',
  'ow.ly',
  'buff.ly',
  'rebrand.ly',
  'cutt.ly',
  'shorturl.at',
  'tiny.cc',
  't.ly',
  'rb.gy',
  's.id',
  // 台灣常見
  'reurl.cc',
  'lihi.cc',
  'lihi1.cc',
  'lihi1.com',
  'lihi2.cc',
  'lihi3.cc',
  'pse.is',
  'ppt.cc',
  'myppt.cc',
  '0rz.tw',
  // 品牌自己的短網址（仍看不出目的地）
  'lin.ee',
  'shp.ee',
];
