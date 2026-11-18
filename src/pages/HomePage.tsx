import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { primaryButtonClass, secondaryButtonClass } from '../styles';

const painPoints = [
  {
    problem: '術語看不懂',
    solution: '資安報告滿是專有名詞。我們只給三種判定結果：已知惡意、可疑、查無紀錄，並用白話說明原因。',
  },
  {
    problem: '怕誤點',
    solution: '收到連結不確定能不能點？先把網址貼上來查，再決定下一步，並附上具體建議。',
  },
  {
    problem: '怕隱私外洩',
    solution: '比對全部在你的瀏覽器內完成，你貼上的網址不會送出瀏覽器。',
  },
];

/** 佔位內容：數據卡要放什麼仍是待決事項（見 CLAUDE.md） */
const stats = [
  { value: '000', label: '數據待定' },
  { value: '000', label: '數據待定' },
  { value: '000', label: '數據待定' },
];

type HomeSectionProps = {
  title: string;
  /** dark：滿版深藍底、白字。整頁只有數據區使用，作為唯一的色塊 */
  tone?: 'light' | 'dark';
  children: ReactNode;
};

/** 主視覺之後的內容區塊：以 H2 命名；背景滿版，內容置中並在捲動時滑入 */
function HomeSection({ title, tone = 'light', children }: HomeSectionProps) {
  const titleId = useId();
  const background = tone === 'dark' ? 'bg-primary text-surface-raised' : '';
  return (
    <section aria-labelledby={titleId} className={background}>
      <div className="reveal mx-auto w-full max-w-6xl px-4 py-20 md:px-6 md:py-32">
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </section>
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

      <HomeSection title="常見的擔心">
        <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
          {painPoints.map(({ problem, solution }) => (
            <li key={problem} className="border-t-4 border-primary pt-6">
              <h3 className="text-2xl font-bold">{problem}</h3>
              <p className="mt-4 text-text-secondary">{solution}</p>
            </li>
          ))}
        </ul>
      </HomeSection>

      <HomeSection title="平台數據" tone="dark">
        <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
          {stats.map(({ value, label }, index) => (
            <li key={index} className="border-t border-surface-raised pt-6">
              <p className="text-7xl font-bold md:text-8xl">{value}</p>
              <p className="mt-4">{label}</p>
            </li>
          ))}
        </ul>
      </HomeSection>

      <HomeSection title="收到可疑連結？">
        <div className="mt-12 flex flex-col gap-4 sm:flex-row">
          <Link to="/analyze" className={primaryButtonClass}>
            檢查網址
          </Link>
          <Link to="/intel" className={secondaryButtonClass}>
            看最新情資
          </Link>
        </div>
      </HomeSection>
    </>
  );
}
