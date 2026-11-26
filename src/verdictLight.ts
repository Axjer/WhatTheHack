import type { Verdict } from './analysis/analyzeUrl';

/** 查無紀錄的固定文案（CLAUDE.md），完整呈現、不拆開 */
export const noRecordText =
  '目前的資料庫中沒有這個網址的紀錄。這不代表它安全；如果訊息來源可疑，請先向寄件人或 IT 人員確認。';

/** 燈號：顏色＋圖示＋文字標籤（不只靠顏色）。紅、黃、灰只用在判定結果 */
export const verdictLight: Record<
  Verdict,
  { icon: string; label: string; cardClass: string; textClass: string; chipClass: string; iconClass: string }
> = {
  'known-malicious': {
    icon: '⛔',
    label: '已知惡意',
    cardClass: 'bg-danger-bg border border-danger/40',
    textClass: 'text-danger',
    chipClass: 'border-danger/40 text-danger',
    iconClass: '',
  },
  suspicious: {
    icon: '⚠️',
    label: '可疑',
    cardClass: 'bg-warning-bg border border-warning',
    // 黃底上一律用深色字
    textClass: 'text-text-primary',
    chipClass: 'border-warning text-text-primary',
    iconClass: '',
  },
  'no-record': {
    icon: '❔',
    label: '查無紀錄',
    // 虛線外框：與一般灰色卡片區隔
    cardClass: 'bg-unknown-bg border-2 border-dashed border-unknown',
    textClass: 'text-unknown',
    chipClass: 'border-unknown/50 text-unknown',
    // ❔ 是白色的 emoji，放在灰色圓底上才看得見
    iconClass: 'grid size-[1.15em] place-items-center rounded-full bg-unknown text-[0.75em] leading-none',
  },
};
