/** 網站上所有日期時間都以台灣時間顯示 */
const TIME_ZONE = 'Asia/Taipei';

/** 資料超過這個時間沒更新就提醒（惡意網址清單、最新情資） */
export const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

/**
 * 每日更新的時間，對應 .github/workflows/deploy.yml 的排程（00:00 UTC）。改排程時要一起改。
 */
export const DAILY_UPDATE_TIME = '每天早上 8 點';

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
const weekdayFormat = new Intl.DateTimeFormat('zh-TW', { timeZone: TIME_ZONE, weekday: 'short' });

/** YYYY-MM-DD HH:MM（例：清單更新於、情資更新於） */
export function formatTaipeiTime(iso: string): string {
  const parts = dateTimeFormat.formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`;
}

/** YYYY-MM-DD：用來把同一天的資料歸在一起 */
export function formatTaipeiDay(iso: string): string {
  return dayFormat.format(new Date(iso));
}

/** 11/23 */
export function formatMonthDay(iso: string): string {
  return monthDayFormat.format(new Date(iso));
}

/** 週一 */
export function formatWeekday(iso: string): string {
  return weekdayFormat.format(new Date(iso));
}

/** 更新時間是否已超過 48 小時 */
export function isStale(iso: string, now: number): boolean {
  return now - Date.parse(iso) > STALE_AFTER_MS;
}
