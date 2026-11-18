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

const buttonVariantClass = {
  /** 主按鈕：實心深藍 */
  primary: 'border-2 border-transparent bg-primary text-surface-raised hover:bg-primary-hover',
  /** 次按鈕：深藍外框 */
  secondary: 'border-2 border-primary bg-surface-raised text-primary hover:border-primary-hover hover:text-primary-hover',
};

const buttonSizeClass = {
  md: 'px-4 py-2',
  lg: 'px-8 py-4 text-lg',
};

/** 按鈕樣式（也用在外觀像按鈕的連結） */
export function buttonClass(variant: keyof typeof buttonVariantClass, size: keyof typeof buttonSizeClass = 'lg') {
  return (
    `${interactiveClass} inline-flex items-center justify-center gap-2 rounded-lg font-bold shadow-sm ` +
    `focus-visible:outline-primary ${buttonVariantClass[variant]} ${buttonSizeClass[size]}`
  );
}
