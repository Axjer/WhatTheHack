import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import { loadKev } from '../data/loadKev';
import { loadStats } from '../data/stats';
import { buttonClass } from '../styles';

/** 連到站內某頁的按鈕 */
type PageLink = { label: string; to: string };

const painPoints = [
  {
    problem: '怕誤點',
    summary: '先查詢再點',
    detail:
      '簡訊、LINE 或 Email 裡的連結，點之前先貼上來。我們會比對惡意網址清單，也會檢查常見的可疑特徵，例如短網址或直接使用 IP 位址。',
  },
  {
    problem: '術語看不懂',
    summary: '白話講結果',
    detail:
      '不用懂什麼是釣魚網站或惡意程式。網址分析只會給出三種判定結果：已知惡意、可疑、查無紀錄，每種結果都用日常說得懂的話說明原因，並告訴你下一步該怎麼做。',
  },
  {
    problem: '跟不上資安消息',
    summary: '只看重要的',
    detail:
      '每天挑出三則最重要的資安新聞，由 AI 依原文整理成白話摘要；同時列出近 30 天正被攻擊的軟體。',
  },
];

/** 數據卡的數字：載入中或讀不到時為 null（顯示「—」，不顯示 0，以免讀成「沒有惡意網址」） */
type StatCounts = { maliciousUrls: number | null; kevProducts: number | null };

function useStatCounts(): StatCounts {
  const [counts, setCounts] = useState<StatCounts>({ maliciousUrls: null, kevProducts: null });

  useEffect(() => {
    let active = true;
    const update = (patch: Partial<StatCounts>) => {
      if (active) setCounts((current) => ({ ...current, ...patch }));
    };
    loadStats().then(
      ({ maliciousUrlCount }) => {
        if (Number.isInteger(maliciousUrlCount) && maliciousUrlCount > 0) update({ maliciousUrls: maliciousUrlCount });
      },
      () => {},
    );
    loadKev().then(
      // 從未成功更新的統計檔（updatedAt 為 null）沒有可信的數字
      ({ updatedAt, products }) => {
        if (updatedAt && Array.isArray(products)) update({ kevProducts: products.length });
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, []);

  return counts;
}

/**
 * 數據卡的大數字：只保留最高位、其餘捨去，再加「+」（90,123 → 90,000+、38 → 30+）。
 * 數字每天會變，往下取整才不會誇大；剛好整數或個位數時照實顯示、不加「+」。
 */
export function formatApproxCount(count: number | null): string {
  if (count === null) return '—';
  const magnitude = 10 ** (String(Math.trunc(count)).length - 1);
  const floored = Math.floor(count / magnitude) * magnitude;
  return `${floored.toLocaleString('zh-TW')}${floored < count ? '+' : ''}`;
}

/** 頁面最底部的兩個行動區塊 */
const actions: { title: string; description: string; link: PageLink }[] = [
  {
    title: '網址分析',
    description: '貼上一個網址，馬上看到判定結果與建議',
    link: { label: '了解更多', to: '/analyze' },
  },
  {
    title: '最新情資',
    description: '每天整理值得注意的資安新聞，以及已遭駭客利用的漏洞',
    link: { label: '了解更多', to: '/intel' },
  },
];

type HomeSectionProps = {
  title: string;
  /** 上下留白：tight 用於相鄰的白底區塊，避免中間空一大片 */
  spacing?: 'default' | 'tight';
  /** 標題只給輔助科技讀取，畫面上不顯示 */
  hideTitle?: boolean;
  /** surface：頁面冷白底；raised：白底；navy：滿版深海軍藍底、白字（交錯排版） */
  tone?: keyof typeof sectionToneClass;
  children: ReactNode;
};

const sectionToneClass = {
  surface: '',
  raised: 'bg-surface-raised',
  navy: 'bg-navy text-surface-raised',
};

/** 主視覺之後的內容區塊：以 H2 命名；背景滿版，內容置中 */
function HomeSection({ title, hideTitle = false, spacing = 'default', tone = 'surface', children }: HomeSectionProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={sectionToneClass[tone]}>
      <div
        className={`mx-auto w-full max-w-6xl px-4 md:px-6 ${
          spacing === 'tight' ? 'py-14 md:py-20' : 'py-20 md:py-32'
        }`}
      >
        <h2 id={titleId} className={hideTitle ? 'sr-only' : 'reveal font-semibold'}>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

/** 行動區塊按鈕裡的箭頭圖示 */
function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 8h12M9 3l5 5-5 5" />
    </svg>
  );
}

/**
 * 主視覺旁的判定示範，三拍：逐字打出網址 → 轉成 defang 格式 → 出現燈號。
 * 動畫在 index.css 的 .hero-demo-*；減少動態或未播放時直接是最終畫面（defang 網址＋燈號）。
 */
const demoUrl = 'https://evil.com';
const demoUrlDefanged = 'hxxps://evil[.]com';

function VerdictDemo() {
  return (
    <figure
      aria-labelledby="verdict-demo-caption"
      className="reveal flex flex-col gap-8 rounded-xl border border-text-primary/10 bg-surface-sunken p-6 shadow-sm md:p-10"
    >
      <figcaption id="verdict-demo-caption" className="sr-only">
        範例：貼上網址後的判定結果
      </figcaption>
      {/* --chars：打字與游標動畫的步數，等於網址字元數（等寬字一步一字） */}
      <div
        className="grid rounded-lg bg-surface-raised px-5 py-4 font-mono text-xl md:text-2xl"
        style={{ '--chars': demoUrl.length } as CSSProperties}
      >
        <span aria-hidden="true" className="hero-demo-typed col-start-1 row-start-1 justify-self-start opacity-0">
          {demoUrl}
        </span>
        <span
          aria-hidden="true"
          className="hero-demo-caret col-start-1 row-start-1 h-[1.2em] w-0.5 self-center justify-self-start bg-text-primary opacity-0"
        />
        <span className="hero-demo-defanged col-start-1 row-start-1">{demoUrlDefanged}</span>
      </div>
      <div className="hero-demo-verdict">
        <p
          data-verdict
          className="inline-block rounded-lg bg-danger-bg px-4 py-2 text-h2 font-semibold text-danger"
        >
          已知惡意
        </p>
        <p className="mt-3 text-sm text-text-secondary">這個網址在惡意網址清單中，請不要點開。</p>
      </div>
    </figure>
  );
}

export default function HomePage() {
  const counts = useStatCounts();
  const stats = [
    { value: formatApproxCount(counts.maliciousUrls), unit: '筆', label: '已知惡意網址' },
    // 「近期」指 KEV 統計的近 30 天
    { value: formatApproxCount(counts.kevProducts), unit: '項', label: '近期受攻擊軟體' },
    // 每日更新一次（cron-job.org 觸發）：不寫「即時」
    { value: '24', unit: '小時', label: '自動更新一次' },
  ];

  return (
    <>
      <section
        aria-labelledby="hero-title"
        className="mx-auto grid min-h-[calc(100svh-4.5rem)] w-full max-w-6xl content-center items-center gap-12 px-4 py-16 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:px-6"
      >
        <h1 id="hero-title" className="reveal text-display">
          <span className="block font-bold">駭你好，先別點！</span>
          <span className="mt-4 block text-[0.6em] font-normal text-text-secondary">
            貼上網址，用<strong className="font-bold text-text-primary">白話</strong>告訴你能不能點
          </span>
        </h1>
        <VerdictDemo />
      </section>

      <HomeSection title="常見的擔心" hideTitle tone="navy">
        <ul className="flex flex-col gap-16 md:gap-16">
          {painPoints.map(({ problem, summary, detail }, index) => {
            const mirrored = index % 2 === 1;
            return (
              <li key={problem} className="grid items-center gap-8 md:grid-cols-2 md:gap-10">
                {/* 卡片在右時文字靠左，卡片在左時文字靠右；一律貼著頁面邊緣 */}
                <div className={`reveal-stagger ${mirrored ? 'md:order-2 md:text-right' : ''}`}>
                  <h3 className="text-5xl font-normal leading-tight md:text-6xl">{problem}</h3>
                  <p className="mt-5 text-xl text-surface-raised/80">{summary}</p>
                </div>
                <div className="reveal-stagger-late flex rounded-xl border border-surface-raised/10 bg-navy-raised p-8 md:min-h-[24rem] md:items-center md:p-12">
                  <p className="text-xl">{detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </HomeSection>

      <HomeSection title="平台數據" tone="raised" spacing="tight">
        <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
          {stats.map(({ value, unit, label }) => (
            <li key={label} className="reveal rounded-xl bg-surface-sunken p-6 lg:p-8">
              {value === '—' ? (
                // 讀不到資料：只顯示次要文字色的「—」，不帶單位，讀起來是「尚無資料」
                <p className="text-5xl font-semibold text-text-secondary md:text-4xl lg:text-6xl">—</p>
              ) : (
                // 單位小一號、與數字基線對齊；768px 三欄時卡片最窄，數字縮一級，單位放不下就整個換行
                <p className="flex flex-wrap items-baseline gap-x-2 font-semibold text-text-primary">
                  <span className="text-5xl tabular-nums md:text-4xl lg:text-6xl">{value}</span>
                  <span className="text-2xl md:text-xl lg:text-3xl">{unit}</span>
                </p>
              )}
              <p className="mt-4 text-text-secondary">{label}</p>
            </li>
          ))}
        </ul>
      </HomeSection>

      <HomeSection title="收到可疑連結？" hideTitle tone="raised" spacing="tight">
        <ul className="grid gap-6 md:grid-cols-2">
          {actions.map(({ title, description, link }) => (
            <li key={title} className="reveal flex flex-col rounded-xl bg-surface-sunken p-6 md:p-10">
              <h3 className="text-2xl font-semibold md:text-3xl">{title}</h3>
              <p className="mt-3 mb-8 text-text-secondary">{description}</p>
              <Link to={link.to} className={`mt-auto self-start ${buttonClass('navy')} font-semibold!`}>
                {link.label}
                {/* 兩顆按鈕文字相同，附上目的地讓螢幕閱讀器分得出來 */}
                <span className="sr-only">{title}</span>
                <ArrowIcon />
              </Link>
            </li>
          ))}
        </ul>
      </HomeSection>
    </>
  );
}
