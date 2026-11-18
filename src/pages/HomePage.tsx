import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { buttonClass } from '../styles';

const painPoints = [
  {
    problem: '術語看不懂',
    summary: '白話說明，每個結果都附下一步',
    detail: '我們只給三種判定結果：已知惡意、可疑、查無紀錄，並用日常說得懂的話說明原因，附上該怎麼做的建議。',
    link: { label: '看判定方式', to: '/about' },
  },
  {
    problem: '怕誤點',
    summary: '先查再點',
    detail: '收到連結不確定能不能點？把網址貼上來，我們會檢查它是否在惡意網址清單中，以及有沒有可疑的警訊。',
    link: { label: '認識警訊', to: '/about' },
  },
  {
    problem: '怕隱私外洩',
    summary: '輸入不會送出瀏覽器',
    detail: '比對全部在你的瀏覽器內完成，你貼上的網址不會傳到任何伺服器。',
    link: { label: '隱私與限制', to: '/about' },
  },
];

/** 佔位內容：數據卡要放什麼仍是待決事項（見 CLAUDE.md） */
const stats = [
  { value: '000', label: '數據待定' },
  { value: '000', label: '數據待定' },
  { value: '000', label: '數據待定' },
];

/** 頁面最底部的兩個行動區塊 */
const actions = [
  {
    title: '網址分析',
    description: '貼上一個網址，馬上看到判定結果與建議。',
    link: { label: '檢查網址', to: '/analyze', variant: 'primary' },
  },
  {
    title: '最新情資',
    description: '每天整理值得注意的資安新聞，以及已遭駭客利用的漏洞。',
    link: { label: '看最新情資', to: '/intel', variant: 'secondary' },
  },
] as const;

type HomeSectionProps = {
  title: string;
  /** 標題只給輔助科技讀取，畫面上不顯示 */
  hideTitle?: boolean;
  /** dark：滿版深藍底、白字。整頁只有數據區使用，作為唯一的色塊 */
  tone?: 'light' | 'dark';
  children: ReactNode;
};

/** 主視覺之後的內容區塊：以 H2 命名；背景滿版，內容置中 */
function HomeSection({ title, hideTitle = false, tone = 'light', children }: HomeSectionProps) {
  const titleId = useId();
  const background = tone === 'dark' ? 'bg-primary text-surface-raised' : '';
  return (
    <section aria-labelledby={titleId} className={background}>
      <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6 md:py-32">
        <h2 id={titleId} className={hideTitle ? 'sr-only' : 'reveal'}>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 8h12M9 3l5 5-5 5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <>
      <section
        aria-labelledby="hero-title"
        className="mx-auto flex min-h-svh w-full max-w-6xl flex-col justify-center px-4 py-16 md:px-6"
      >
        <h1 id="hero-title" className="max-w-3xl">
          <span className="block">駭你好，先別點！</span>
          <span className="mt-4 block font-medium">
            貼上網址，用
            <em className="text-primary not-italic underline decoration-4 underline-offset-8">白話</em>
            告訴你能不能點
          </span>
        </h1>
      </section>

      <HomeSection title="常見的擔心" hideTitle>
        <ul className="flex flex-col gap-20 md:gap-32">
          {painPoints.map(({ problem, summary, detail, link }, index) => {
            const mirrored = index % 2 === 1;
            return (
              <li key={problem} className="grid items-center gap-6 md:grid-cols-2 md:gap-16">
                <div className={`reveal ${mirrored ? 'md:order-2 md:text-right' : ''}`}>
                  <h3 className="text-3xl font-bold md:text-4xl">{problem}</h3>
                  <p className="mt-3 text-lg font-medium text-primary">{summary}</p>
                </div>
                <div className="reveal-late rounded-xl bg-surface-raised p-6 shadow-sm md:p-8">
                  <p className="text-text-secondary">{detail}</p>
                  <Link to={link.to} className={`mt-6 ${buttonClass('secondary', 'md')}`}>
                    {link.label}
                    <ChevronIcon />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </HomeSection>

      <HomeSection title="平台數據" tone="dark">
        <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
          {stats.map(({ value, label }, index) => (
            <li key={index} className="reveal border-t border-surface-raised pt-6">
              <p className="text-7xl font-bold md:text-8xl">{value}</p>
              <p className="mt-4">{label}</p>
            </li>
          ))}
        </ul>
      </HomeSection>

      <HomeSection title="收到可疑連結？" hideTitle>
        <ul className="grid gap-6 md:grid-cols-2">
          {actions.map(({ title, description, link }) => (
            <li key={title} className="reveal flex flex-col rounded-xl bg-surface-raised p-6 shadow-sm md:p-10">
              <h3 className="text-2xl font-bold md:text-3xl">{title}</h3>
              <p className="mt-3 mb-8 text-text-secondary">{description}</p>
              <Link to={link.to} className={`mt-auto self-start ${buttonClass(link.variant)}`}>
                {link.label}
                <ArrowIcon />
              </Link>
            </li>
          ))}
        </ul>
      </HomeSection>
    </>
  );
}
