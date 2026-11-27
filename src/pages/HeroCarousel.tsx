import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowIcon } from '../components/ArrowIcon';
import { buttonClass, interactiveClass } from '../styles';
import { verdictLight } from '../verdictLight';

/**
 * 首頁主視覺：兩張輪播（網址分析、最新情資），左文字、右插畫。
 * 插畫動畫播完後 8 秒自動換下一張；也可以按左右箭頭、點指示線或左右滑動換張。目前這張的指示線整條填滿。
 * 沒有暫停按鈕：滑鼠停在主視覺上或鍵盤焦點在裡面時暫停；使用者要求減少動態時不自動換張。
 * 使用者要求減少動態時，插畫直接顯示最終畫面。
 * 插畫內的尺寸用 cqi（插畫寬度的百分比；插畫是 @container），任何寬度下比例都一樣。
 */

/** 動畫延遲（CSS 變數 --delay），讓同一張插畫裡的元素依序出現 */
function delay(seconds: number): CSSProperties {
  return { '--delay': `${seconds}s` } as CSSProperties;
}

/** 第一張插畫：網址卡片被掃描線掃過，放大鏡停在「@」上，接著浮現「可疑」的風險提示 */
function UrlScanIllustration() {
  const captionId = useId();
  const light = verdictLight.suspicious;
  return (
    <figure aria-labelledby={captionId} className="@container relative mx-auto aspect-[5/4] w-full max-w-lg">
      <figcaption id={captionId} className="sr-only">
        範例：檢查網址後的判定結果
      </figcaption>

      {/* 網址卡片 */}
      <div className="absolute top-[4%] left-0 w-[94%] rounded-[3cqi] bg-surface-raised p-[5cqi] shadow-sm">
        {/* 掃描線：由左往右掃過整張卡片，後面拖著一段淡淡的掃過痕跡 */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[3cqi]">
          <div className="hero-anim-scan absolute inset-y-0 -left-full w-full border-r-2 border-primary bg-linear-to-r from-transparent to-primary/10 opacity-0" />
        </div>
        <p className="text-[length:max(0.875rem,3.6cqi)] text-text-secondary">收到的連結</p>
        <p className="relative mt-[2cqi] font-mono text-[length:4.6cqi] whitespace-nowrap">
          hxxps://bank.com
          {/* 「@」兩側留白，放大鏡蓋住「@」時不會擋到前後的字 */}
          <span className="relative mx-[3.6cqi] inline-block">
            @
            {/* 放大鏡：鏡片裡是放大的「@」，握把往右下 */}
            <span
              aria-hidden="true"
              className="hero-anim-lens pointer-events-none absolute top-1/2 left-1/2 size-[10.5cqi] -translate-x-1/2 -translate-y-1/2"
            >
              <span className="grid size-full place-items-center rounded-full border-[0.9cqi] border-navy bg-surface-raised text-[length:6.5cqi] leading-none font-semibold text-navy shadow-sm after:content-['@']" />
              <span className="absolute top-[86%] left-[86%] h-[7cqi] w-[2cqi] origin-top -rotate-45 rounded-full bg-navy" />
            </span>
          </span>
          evil[.]com
        </p>
      </div>

      {/* 風險提示：掃描完才浮現 */}
      <div className="hero-anim-tag absolute top-[44%] right-0 w-[76%] rounded-[3cqi] bg-surface-raised p-[5cqi] shadow-md">
        <p
          data-verdict
          className={`inline-block rounded-lg px-4 py-1 text-h2 font-semibold ${light.cardClass} ${light.textClass}`}
        >
          {light.label}
        </p>
        <p className="mt-[3cqi] text-[length:max(0.875rem,3.6cqi)] leading-relaxed text-text-secondary">
          網址中有「@」，瀏覽器會忽略 @ 前面的文字，實際連到的是 <span className="font-mono">evil[.]com</span>。
        </p>
      </div>
    </figure>
  );
}

/** 第二張插畫的網絡節點（viewBox 120×100 的座標）與節點間的連線 */
const networkNodes: [number, number][] = [
  [8, 14],
  [34, 6],
  [64, 10],
  [98, 6],
  [114, 30],
  [6, 46],
  [20, 70],
  [10, 94],
  [44, 92],
  [80, 96],
  [112, 74],
  [104, 52],
];
const networkLinks: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [6, 8],
  [8, 9],
  [9, 10],
  [10, 11],
  [11, 4],
  [2, 11],
  [1, 6],
];

/** 第二張插畫：網絡節點逐一連線，情資卡片（新聞 AI 摘要、正被利用的漏洞）接著浮現。只用主色深藍，不用燈號顏色 */
function IntelIllustration() {
  const captionId = useId();
  return (
    <figure aria-labelledby={captionId} className="@container relative mx-auto aspect-[5/4] w-full max-w-lg">
      <figcaption id={captionId} className="sr-only">
        示意圖：最新情資整理每天的資安新聞，以及正被攻擊的軟體
      </figcaption>
      <div aria-hidden="true">
        <svg viewBox="0 0 120 100" className="absolute inset-0 size-full overflow-visible">
          {networkLinks.map(([from, to], index) => {
            const [x1, y1] = networkNodes[from];
            const [x2, y2] = networkNodes[to];
            return (
              <path
                key={`${from}-${to}`}
                d={`M${x1} ${y1}L${x2} ${y2}`}
                pathLength={1}
                strokeDasharray="1"
                className="hero-anim-link fill-none stroke-primary/30"
                strokeWidth="0.5"
                style={delay(0.3 + index * 0.06)}
              />
            );
          })}
          {networkNodes.map(([cx, cy], index) => (
            <circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r={index % 3 === 0 ? 2.2 : 1.4}
              className={`hero-anim-node ${index % 3 === 0 ? 'fill-surface-raised stroke-primary' : 'fill-primary/70'}`}
              strokeWidth="0.8"
              style={delay(index * 0.04)}
            />
          ))}
        </svg>

        {/* 新聞卡片：AI 摘要 */}
        <div
          className="hero-anim-card absolute top-[8%] left-[12%] w-[62%] rounded-[3cqi] bg-surface-raised p-[5cqi] shadow-md"
          style={delay(0.9)}
        >
          <p className="inline-block rounded-full bg-primary/10 px-[2.5cqi] py-[0.6cqi] text-[length:max(0.75rem,3.2cqi)] font-medium text-primary">
            AI 摘要
          </p>
          <div className="mt-[3.5cqi] h-[3cqi] w-4/5 rounded-full bg-navy/80" />
          <div className="mt-[3cqi] flex flex-col gap-[2cqi]">
            {['w-full', 'w-11/12', 'w-3/5'].map((width) => (
              <span key={width} className={`h-[2cqi] rounded-full bg-text-primary/10 ${width}`} />
            ))}
          </div>
        </div>

        {/* 漏洞卡片：正被利用的軟體 */}
        <div
          className="hero-anim-card absolute top-[60%] right-[2%] w-[64%] rounded-[3cqi] bg-surface-raised p-[5cqi] shadow-md"
          style={delay(1.3)}
        >
          <div className="flex items-center gap-[3cqi]">
            <svg viewBox="0 0 24 24" className="size-[9cqi] shrink-0 rounded-[2cqi] bg-primary/10 p-[1.6cqi] text-primary" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" strokeLinejoin="round" />
              <path d="M12 8v5M12 16.5v.5" strokeLinecap="round" />
            </svg>
            <div className="flex-1">
              <div className="h-[3cqi] w-3/4 rounded-full bg-navy/80" />
              <p className="mt-[2cqi] text-[length:max(0.75rem,3.4cqi)] text-text-secondary">3 個漏洞正被利用</p>
            </div>
          </div>
          <p className="mt-[3.5cqi] inline-block rounded-full bg-primary/10 px-[2.5cqi] py-[0.6cqi] text-[length:max(0.75rem,3.2cqi)] font-medium text-primary">
            已被用於勒索軟體攻擊
          </p>
        </div>
      </div>
    </figure>
  );
}

type Slide = {
  /** 給指示線的名稱（螢幕閱讀器讀「第 N 張：名稱」） */
  name: string;
  /** 主標；分成多段時桌面版每段各占一行（手機照常換行） */
  title: string[];
  subtitle: string;
  cta: { label: string; to: string };
  illustration: ReactNode;
  /** 插畫動畫播完的時間（秒），與 index.css 的 .hero-anim-* 延遲＋長度一致；播完後再等 autoAdvanceDelay 自動換張 */
  animationSeconds: number;
};

const slides: Slide[] = [
  {
    name: '網址分析',
    title: ['收到可疑連結？'],
    subtitle: '透過網址分析，幫助你辨識潛在風險。',
    cta: { label: '開始分析', to: '/analyze' },
    illustration: <UrlScanIllustration />,
    // 風險提示卡 2.2s 開始浮現，0.6s 浮完
    animationSeconds: 2.8,
  },
  {
    name: '最新情資',
    title: ['威脅持續變化！'],
    subtitle: '用簡單易懂的方式掌握威脅動態。',
    cta: { label: '了解情資', to: '/intel' },
    illustration: <IntelIllustration />,
    // 第二張情資卡片 1.3s 開始浮現，0.6s 浮完（連線約 1.8s 畫完）
    animationSeconds: 1.9,
  },
];

/** 一張輪播：沒輪到時隱藏（不可聚焦、輔助科技也讀不到），與其他張疊在同一格，切換時淡入淡出 */
function HeroSlide({ slide, active }: { slide: Slide; active: boolean }) {
  const titleId = useId();
  return (
    <div
      role="group"
      aria-roledescription="投影片"
      aria-labelledby={titleId}
      aria-hidden={active ? undefined : true}
      inert={!active}
      data-active={active || undefined}
      className={`hero-slide col-start-1 row-start-1 transition-[opacity,visibility] duration-500 motion-reduce:transition-none ${active ? '' : 'invisible opacity-0'}`}
    >
      <div className="mx-auto grid h-full w-full max-w-6xl content-center items-center gap-10 px-4 pt-12 pb-4 md:grid-cols-2 md:px-20 md:py-12 lg:gap-16 xl:px-6">
        {/* 文字欄是 @container：主標最大 --text-display，欄寬不夠時跟著縮小（7 個字排得下一行） */}
        <div className="@container">
          <h2 id={titleId} className="text-[length:min(var(--text-display),14cqi)] leading-tight font-bold">
            {slide.title.map((line) => (
              <span key={line} className="md:block">
                {line}
              </span>
            ))}
          </h2>
          <p className="mt-5 text-xl leading-relaxed text-text-secondary md:text-2xl">{slide.subtitle}</p>
          <Link to={slide.cta.to} className={`mt-10 ${buttonClass('navy')} font-semibold!`}>
            {slide.cta.label}
            <ArrowIcon />
          </Link>
        </div>
        {slide.illustration}
      </div>
    </div>
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 左右兩側的上一張／下一張按鈕（桌面才顯示；手機用滑動或指示線切換） */
const arrowButtonClass =
  `${interactiveClass} absolute top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full ` +
  'bg-surface-raised text-navy shadow-sm hover:bg-surface-muted focus-visible:outline-primary md:grid';

/** 滑動超過這個距離（px）才換張 */
const swipeThreshold = 50;

/** 插畫動畫播完後，停留這麼久（毫秒）再自動換下一張 */
const autoAdvanceDelay = 8_000;

/** 使用者要求減少動態時不自動換張 */
function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** 焦點是不是用鍵盤移進來的（滑鼠點按鈕留下的焦點不算） */
function isKeyboardFocus(element: EventTarget) {
  try {
    return element instanceof Element && element.matches(':focus-visible');
  } catch {
    return true;
  }
}

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [keyboardInside, setKeyboardInside] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const show = (index: number) => setCurrent((index + slides.length) % slides.length);

  // 自動輪播：這張的插畫動畫播完後再過 8 秒換下一張；使用者手動換張會重新計時。
  // 滑鼠停在主視覺上、或鍵盤焦點在裡面時暫停（離開後重新計時）
  const paused = hovered || keyboardInside;
  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const timer = window.setTimeout(
      () => setCurrent((index) => (index + 1) % slides.length),
      slides[current].animationSeconds * 1000 + autoAdvanceDelay,
    );
    return () => window.clearTimeout(timer);
  }, [current, paused]);

  return (
    <section
      aria-labelledby="hero-title"
      aria-roledescription="輪播"
      className="flex min-h-[calc(100svh-4.5rem)] flex-col bg-surface-hero"
      // 只有真的滑鼠才算「停在上面」：手機點擊也會觸發移入，卻不一定觸發移出，會讓輪播一直停住
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setHovered(false);
      }}
      onFocus={(event) => setKeyboardInside(isKeyboardFocus(event.target))}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardInside(false);
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (start === null || end === undefined || Math.abs(end - start) < swipeThreshold) return;
        show(end < start ? current + 1 : current - 1);
      }}
    >
      <h1 id="hero-title" className="sr-only">
        駭你好
      </h1>

      <div className="relative grid flex-1">
        {/* 自動輪播時不朗讀換張；暫停時（滑鼠或鍵盤焦點在裡面），換張後讀出新的內容 */}
        <div aria-live={paused ? 'polite' : 'off'} className="grid">
          {slides.map((slide, index) => (
            <HeroSlide key={slide.name} slide={slide} active={index === current} />
          ))}
        </div>
        <button type="button" aria-label="上一張" onClick={() => show(current - 1)} className={`${arrowButtonClass} left-4 lg:left-8`}>
          <ChevronIcon direction="left" />
        </button>
        <button type="button" aria-label="下一張" onClick={() => show(current + 1)} className={`${arrowButtonClass} right-4 lg:right-8`}>
          <ChevronIcon direction="right" />
        </button>
      </div>

      {/* 指示線：目前這張的整條線填滿主色，其他張是淡色 */}
      <div className="flex items-center justify-center gap-2 pt-2 pb-6 md:pb-10">
        {slides.map((slide, index) => (
          <button
            key={slide.name}
            type="button"
            aria-label={`第 ${index + 1} 張：${slide.name}`}
            aria-current={index === current ? 'true' : undefined}
            onClick={() => show(index)}
            className={`${interactiveClass} group rounded-sm px-1 py-4 focus-visible:outline-primary`}
          >
            <span
              className={`block h-1 w-12 rounded-full transition-colors duration-200 md:w-16 ${
                index === current ? 'bg-primary' : 'bg-text-primary/15 group-hover:bg-text-primary/30'
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
