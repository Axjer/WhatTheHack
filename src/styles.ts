/**
 * 互動元件共用的互動狀態（CLAUDE.md「元件風格」）：
 * 0.2s 過渡、Active 縮小、Focus 2px 實線外框。Hover 色、外框顏色與 Default 陰影依所在背景由各元件補上（深藍底與文字連結不加陰影，見 CLAUDE.md）。
 */
export const interactiveClass =
  'transition duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2';

/** 只有可停用的元件（button 等）才需要 Disabled 狀態 */
export const disableableClass = 'disabled:cursor-not-allowed disabled:opacity-50';

/** 淺色底上的文字連結 */
export const textLinkClass =
  `${interactiveClass} inline-block text-primary underline underline-offset-4 ` +
  'hover:text-primary-hover focus-visible:outline-primary';

const buttonBaseClass = `${interactiveClass} inline-flex items-center justify-center rounded-lg px-8 py-4 text-lg font-bold shadow-sm`;

/** 主按鈕：實心深藍 */
export const primaryButtonClass =
  `${buttonBaseClass} bg-primary text-surface-raised hover:bg-primary-hover focus-visible:outline-primary`;

/** 次按鈕：深藍外框 */
export const secondaryButtonClass =
  `${buttonBaseClass} border-2 border-primary bg-surface-raised text-primary ` +
  'hover:border-primary-hover hover:text-primary-hover focus-visible:outline-primary';
