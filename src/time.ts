/** 網站上所有日期時間都以台灣時間顯示 */
const TIME_ZONE = 'Asia/Taipei';

/** 一天（台灣沒有日光節約時間，一天固定 24 小時） */
export const DAY_MS = 24 * 60 * 60 * 1000;

/** 資料超過這個時間沒更新就提醒（惡意網址清單、最新情資） */
export const STALE_AFTER_MS = 2 * DAY_MS;

const dateTimeFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const monthDayFormat = new Intl.DateTimeFormat('zh-TW', { timeZone: TIME_ZONE, month: 'numeric', day: 'numeric' });

/** YYYY-MM-DD HH:MM（例：清單更新於、情資更新於） */
export function formatTaipeiTime(iso: string): string {
  const parts = dateTimeFormat.formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`;
}

/** 台灣時間的日曆日 YYYY-MM-DD：用來比較兩個時間是不是同一天 */
function taipeiDay(time: string | number): string {
  return dayFormat.format(new Date(time));
}

/** 今天／昨天／11/20：以台灣時間的日曆日比較 */
export function formatRelativeDay(iso: string, now: number): string {
  const day = taipeiDay(iso);
  if (day === taipeiDay(now)) return '今天';
  if (day === taipeiDay(now - DAY_MS)) return '昨天';
  return monthDayFormat.format(new Date(iso));
}

/** 更新時間是否已超過 48 小時 */
export function isStale(iso: string, now: number): boolean {
  return now - Date.parse(iso) > STALE_AFTER_MS;
}
