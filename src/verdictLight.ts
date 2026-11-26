import type { Verdict } from './analysis/analyzeUrl';

/** 查無紀錄的固定文案（CLAUDE.md），完整呈現、不拆開 */
export const noRecordText =
  '目前的資料庫中沒有這個網址的紀錄。這不代表它安全；如果訊息來源可疑，請先向寄件人或 IT 人員確認。';

/** 燈號：顏色＋文字標籤（不只靠顏色，不放 emoji）。紅、黃、灰只用在判定結果 */
export const verdictLight: Record<Verdict, { label: string; cardClass: string; textClass: string; chipClass: string }> = {
  'known-malicious': {
    label: '已知惡意',
    cardClass: 'bg-danger-bg border border-danger/40',
    textClass: 'text-danger',
    chipClass: 'border-danger/40 text-danger',
  },
  suspicious: {
    label: '可疑',
    cardClass: 'bg-warning-bg border border-warning',
    // 黃底上一律用深色字
    textClass: 'text-text-primary',
    chipClass: 'border-warning text-text-primary',
  },
  'no-record': {
    label: '查無紀錄',
    // 實線外框
    cardClass: 'bg-unknown-bg border border-unknown/50',
    textClass: 'text-unknown',
    chipClass: 'border-unknown/50 text-unknown',
  },
};
