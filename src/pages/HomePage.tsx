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

const sectionClass = 'reveal mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-24';
const cardClass = 'rounded-xl bg-surface-raised p-6 shadow-sm';

export default function HomePage() {
  return (
    <>
      <section
        aria-labelledby="hero-title"
        className="mx-auto flex min-h-svh w-full max-w-6xl flex-col justify-center px-4 py-16 md:px-6"
      >
        <h1 id="hero-title">
          <span className="block">駭你好，先別點！</span>
          <span className="mt-2 block">
            貼上網址，用
            <em className="text-primary not-italic underline decoration-4 underline-offset-8">白話</em>
            告訴你能不能點
          </span>
        </h1>
      </section>

      <section aria-labelledby="pain-title" className={sectionClass}>
        <h2 id="pain-title">常見的擔心</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
          {painPoints.map(({ problem, solution }) => (
            <li key={problem} className={cardClass}>
              <h3 className="text-lg font-bold">{problem}</h3>
              <p className="mt-2 text-text-secondary">{solution}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="stats-title" className={sectionClass}>
        <h2 id="stats-title">平台數據</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
          {stats.map(({ value, label }, index) => (
            <li key={index} className={cardClass}>
              <p className="text-5xl font-bold text-primary md:text-6xl">{value}</p>
              <p className="mt-2 text-text-secondary">{label}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cta-title" className={sectionClass}>
        <h2 id="cta-title">收到可疑連結？</h2>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link to="/analyze" className={primaryButtonClass}>
            檢查網址
          </Link>
          <Link to="/intel" className={secondaryButtonClass}>
            看最新情資
          </Link>
        </div>
      </section>
    </>
  );
}
