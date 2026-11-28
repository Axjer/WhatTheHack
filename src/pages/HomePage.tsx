import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { loadKev } from '../data/loadKev';
import { loadStats } from '../data/loadStats';
import { formatApproxCount } from './formatApproxCount';
import { buttonClass } from '../styles';
import { ArrowIcon } from '../components/ArrowIcon';
import { HeroCarousel } from './HeroCarousel';

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

/**
 * 數據卡的數字：載入中或讀不到檔案時為 null（顯示「—」）。
 * 惡意網址筆數為 0 也視為 null，以免讀成「沒有惡意網址」；KEV 產品數則照實顯示（含 0）。
 */
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
      // 統計檔裡有幾項就顯示幾項（含 0、含過期的檔案）；只有讀不到檔案才顯示「—」
      ({ products }) => {
        if (Array.isArray(products)) update({ kevProducts: products.length });
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
 * 數據卡大數字的字級，「—」與數字共用：跟著卡片內容寬度縮放（卡片是 @container），最大 6xl（3.75rem）。
 * 「100,000+ 筆」約 4.8 個字高寬，19cqi 讓它在任何寬度都排得下一行；單位固定是數字的一半大。
 */
const statValueSize = 'text-[length:min(3.75rem,19cqi)] leading-none tracking-tight';

/** 頁面最底部的兩個行動區塊：按鈕前往來源與說明頁的對應段落，說明文字介紹那一段會講什麼 */
const actions: { title: string; description: string; link: PageLink; sectionTitle: string }[] = [
  {
    title: '網址分析',
    description: '看看系統依什麼順序，判定已知惡意、可疑或查無紀錄',
    link: { label: '了解更多', to: '/about#verdict' },
    // 按鈕前往的說明段落標題，只給螢幕閱讀器讀：兩顆按鈕文字相同，靠這段分辨目的地
    sectionTitle: '網址分析怎麼判定',
  },
  {
    title: '最新情資',
    description: '了解每天的新聞摘要怎麼產生，以及正被攻擊的軟體清單代表什麼',
    link: { label: '了解更多', to: '/about#intel' },
    sectionTitle: '最新情資怎麼整理',
  },
];

type HomeSectionProps = {
  title: string;
  /**
   * 上下留白。groupTop／groupBottom 用於視為同一組的相鄰白底區塊（數據卡＋行動區塊）：
   * 外側照常留白，兩塊之間只留卡片間距的大小，讀起來是同一組
   */
  spacing?: keyof typeof sectionSpacingClass;
  /** 標題只給輔助科技讀取，畫面上不顯示 */
  hideTitle?: boolean;
  /** 標題下方的一句說明（只在標題顯示時使用） */
  subtitle?: string;
  /** surface：頁面冷白底；raised：白底；navy：滿版深海軍藍底、白字（交錯排版） */
  tone?: keyof typeof sectionToneClass;
  children: ReactNode;
};

const sectionSpacingClass = {
  default: 'py-20 md:py-32',
  groupTop: 'pt-14 pb-6 md:pt-20 md:pb-8',
  groupBottom: 'pt-6 pb-14 md:pt-8 md:pb-20',
};

const sectionToneClass = {
  surface: '',
  raised: 'bg-surface-raised',
  navy: 'bg-navy text-surface-raised',
};

/** 主視覺之後的內容區塊：以 H2 命名；背景滿版，內容置中 */
function HomeSection({
  title,
  hideTitle = false,
  subtitle,
  spacing = 'default',
  tone = 'surface',
  children,
}: HomeSectionProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={sectionToneClass[tone]}>
      <div className={`mx-auto w-full max-w-6xl px-4 md:px-6 ${sectionSpacingClass[spacing]}`}>
        {hideTitle ? (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        ) : (
          // 看得到的區塊標題一律置中，與下方卡片留出一段距離
          <header className="mb-10 text-center md:mb-14">
            <h2 id={titleId} className="text-3xl font-semibold md:text-4xl">
              {title}
            </h2>
            {subtitle && <p className="mx-auto mt-4 max-w-2xl text-text-secondary">{subtitle}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
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
      <HeroCarousel />

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

      {/*
        痛點區之後的白色區塊（數據卡＋行動區塊）至少一個畫面高、內容垂直置中：
        捲到頁面最底時畫面只看到白色區塊與頁尾，不會露出上方的深藍痛點區
      */}
      <div className="flex min-h-svh flex-col justify-center bg-surface-raised">
        <HomeSection
          title="每天持續更新的資安防護網"
          subtitle="串接全球公開威脅資料庫，掌握最新漏洞動態"
          tone="raised"
          spacing="groupTop"
        >
          {/* 卡片間距與下方行動區塊一致（gap-6），讓卡片盡量寬 */}
          <ul className="grid gap-6 md:grid-cols-3">
            {stats.map(({ value, unit, label }) => (
              <li key={label} className="@container rounded-xl bg-surface-muted p-6 lg:px-8 lg:py-10">
                {value === null ? (
                  // 沒有數字：只顯示次要文字色的「—」，不帶單位，讀起來是「尚無資料」
                  <p className={`${statValueSize} font-semibold text-text-secondary`}>—</p>
                ) : (
                  // 單位是數字的一半大、與數字基線對齊；字級跟著卡片寬度縮放，整行排在一行
                  <p
                    className={`${statValueSize} flex items-baseline gap-x-[0.15em] font-semibold whitespace-nowrap text-text-primary`}
                  >
                    <span className="tabular-nums">{value}</span>
                    <span className="text-[0.5em] tracking-normal">{unit}</span>
                  </p>
                )}
                <p className="mt-4 text-text-secondary">{label}</p>
              </li>
            ))}
          </ul>
        </HomeSection>

        <HomeSection
          title="兩大核心功能"
          subtitle="現在就開始你的日常資安防護"
          tone="raised"
          spacing="groupBottom"
        >
          <ul className="grid gap-6 md:grid-cols-2">
            {actions.map(({ title, description, link, sectionTitle }) => (
              <li key={title} className="flex flex-col rounded-xl bg-surface-muted p-6 md:p-10">
                <h3 className="text-2xl font-semibold md:text-3xl">{title}</h3>
                <p className="mt-3 mb-8 text-text-secondary">{description}</p>
                <Link to={link.to} className={`mt-auto self-start ${buttonClass('navy')} font-semibold!`}>
                  {link.label}
                  {/* 兩顆按鈕文字相同，附上目的地讓螢幕閱讀器分得出來 */}
                  <span className="sr-only">{sectionTitle}</span>
                  <ArrowIcon />
                </Link>
              </li>
            ))}
          </ul>
        </HomeSection>
      </div>
    </>
  );
}
