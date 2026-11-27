import type { ReactNode } from 'react';
import type { Verdict } from '../analysis/analyzeUrl';
import ExternalIcon from '../components/ExternalIcon';
import { interactiveClass, textLinkClass } from '../styles';
import { KEV_WINDOW_DAYS } from '../data/kev';
import { verdictLight } from '../verdictLight';

/** 本頁各段落：目錄與段落標題共用 */
const sections = [
  { id: 'verdict', title: '網址分析怎麼判定' },
  { id: 'intel', title: '最新情資怎麼整理' },
  { id: 'sources', title: '資料來源' },
  { id: 'privacy', title: '隱私' },
  { id: 'disclaimer', title: '免責聲明' },
] as const;

type SectionId = (typeof sections)[number]['id'];

const sectionTitle = (id: SectionId) => sections.find((section) => section.id === id)!.title;

/** 範例網址：以 defang 格式顯示、等寬字、不可點擊 */
function ExampleUrl({ children }: { children: string }) {
  return <span className="font-mono break-all">{children}</span>;
}

/** 警訊（三項，GLOSSARY.md）：白話說明＋defang 後的範例 */
const warningSigns: { name: string; example: string; explanation: ReactNode }[] = [
  {
    name: '直接使用 IP 位址',
    example: 'hxxp://203[.]0[.]113[.]5/login',
    explanation: '網址用一串數字代替網站名稱。正常網站很少這樣做。',
  },
  {
    name: '短網址服務',
    example: 'hxxps://bit[.]ly/3xYzAb',
    explanation: '例如 bit.ly、reurl.cc。短網址看不出點開後真正會連到哪裡，而且任何人都能建立。',
  },
  {
    name: '網址中含「@」',
    example: 'hxxps://bank[.]com@evil[.]com',
    explanation: (
      <>
        瀏覽器會忽略網域前面 @ 之前的文字，這個範例實際連到的是 <ExampleUrl>evil[.]com</ExampleUrl>
        ，不是銀行。路徑裡的 @ 不算。
      </>
    ),
  },
];

type Step = {
  question: string;
  detail: ReactNode;
  verdict: Verdict;
  meaning: ReactNode;
};

/** 判定順序：依序檢查，停在第一個符合的步驟 */
const steps: Step[] = [
  {
    question: '網址在惡意網址清單中嗎？',
    detail: (
      <>
        <p>
          惡意網址清單由 URLhaus 與 OpenPhish 每天彙整，收錄已被通報用來騙取帳號密碼或散布惡意程式的網址。系統同時比對完整網址和網域：網域被通報過，同一個網域下的其他網址也算。
        </p>
        <p className="mt-3 text-text-secondary">
          例外：Google 雲端硬碟（<ExampleUrl>drive.google.com</ExampleUrl>）、GitHub Pages（
          <ExampleUrl>github.io</ExampleUrl>）這類任何人都能上傳內容的共用平台，以及短網址服務，只比對完整網址。有人在上面放了惡意檔案，不代表整個平台都是惡意的。
        </p>
      </>
    ),
    verdict: 'known-malicious',
    meaning: '這個網址或它所在的網域曾被通報。請不要點擊。',
  },
  {
    question: '網址有任何一項警訊嗎？',
    detail: (
      <>
        <p>警訊是網址本身的可疑特徵。系統會自動檢查以下三項，結果只說明符合的項目。</p>
        <dl className="mt-4 flex flex-col gap-4">
          {warningSigns.map(({ name, example, explanation }) => (
            <div key={name} className="rounded-lg bg-surface-raised p-4 shadow-sm">
              <dt className="font-bold">{name}</dt>
              <dd className="mt-1">
                <p className="text-text-secondary">
                  <span className="sr-only">範例：</span>
                  <ExampleUrl>{example}</ExampleUrl>
                </p>
                <p className="mt-1">{explanation}</p>
              </dd>
            </div>
          ))}
        </dl>
      </>
    ),
    verdict: 'suspicious',
    meaning: '網址不在惡意網址清單中，但有可疑的特徵。點開前請先向寄件人確認。',
  },
  {
    question: '以上都沒有',
    detail: <p>網址不在惡意網址清單中，也沒有任何警訊。</p>,
    verdict: 'no-record',
    meaning:
      '這不代表網址安全：清單只收錄已被通報的網址，剛建立的詐騙網址可能還沒被收錄。所以本站刻意不用綠燈。',
  },
];

/** 一步的結果：符合時停在這個燈號（顏色＋文字，字級等同 H2） */
function StepOutcome({ verdict, meaning, last }: { verdict: Verdict; meaning: ReactNode; last: boolean }) {
  const light = verdictLight[verdict];
  return (
    <div className={`mt-5 flex flex-col gap-x-6 gap-y-1 rounded-xl p-4 sm:flex-row sm:items-center md:px-6 ${light.cardClass} ${light.textClass}`}>
      <p className="shrink-0 text-h2 font-bold">
        <span className="sr-only">{last ? '判定為' : '符合就判定為'}</span>
        {light.label}
      </p>
      <p className="font-medium">{meaning}</p>
    </div>
  );
}

/** 判定順序的階梯：左側編號與連接線，每一步符合就停下，不符合往下一步 */
function VerdictLadder() {
  return (
    <ol aria-label="判定順序" className="mt-8">
      {steps.map(({ question, detail, verdict, meaning }, index) => {
        const last = index === steps.length - 1;
        return (
          <li key={verdict} className="relative grid grid-cols-[2.5rem_1fr] gap-x-4 md:grid-cols-[3rem_1fr] md:gap-x-6">
            {/* 連接線：從編號往下接到下一步 */}
            {!last && (
              <span aria-hidden="true" className="absolute top-12 bottom-0 left-5 w-0.5 -translate-x-1/2 bg-primary/25 md:left-6" />
            )}
            <span
              aria-hidden="true"
              className="relative grid size-10 place-items-center rounded-full bg-primary text-lg font-bold text-surface-raised md:size-12 md:text-xl"
            >
              {index + 1}
            </span>
            <div className={last ? '' : 'pb-10'}>
              <h3 className="pt-1 text-xl leading-snug font-bold md:pt-2">
                <span className="sr-only">第 {index + 1} 步：</span>
                {question}
              </h3>
              <div className="mt-3">{detail}</div>
              <StepOutcome verdict={verdict} meaning={meaning} last={last} />
              {!last && (
                <p className="mt-4 flex items-center gap-2 text-text-secondary">
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M8 2v11M3.5 8.5 8 13l4.5-4.5" />
                  </svg>
                  不符合，繼續檢查下一步
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** 和最新情資頁同樣的標籤外觀，讓讀者到情資頁一眼認得（只用主色深藍，不用燈號顏色） */
function AiSummaryTag() {
  return (
    <span className="inline-block rounded-full bg-surface-sunken px-3 py-1 text-sm font-medium whitespace-nowrap text-primary">
      AI 摘要
    </span>
  );
}

function RansomwareTag() {
  return (
    <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium whitespace-nowrap text-primary">
      已被用於勒索軟體攻擊
    </span>
  );
}

/** 新聞摘要每天產生的先後順序 */
const newsSteps = [
  '取得 The Hacker News 過去 24 小時的新聞。',
  'AI 以資安專家的角度，挑出最重要、影響最大的 3 篇。',
  'AI 只根據原文，把每篇寫成 2–3 句白話摘要。',
];

function SubsectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-xl leading-snug font-bold">{children}</h3>;
}

/** 最新情資怎麼整理：新聞摘要怎麼產生、可能出錯；最近正被攻擊的軟體代表什麼、怎麼看 */
function IntelExplanation() {
  return (
    <>
      <p>
        最新情資頁每天自動整理兩件事：三則值得注意的資安新聞，以及近 {KEV_WINDOW_DAYS}{' '}
        天正被攻擊的軟體。它幫你掌握最近發生了什麼，不會檢查你的裝置。
      </p>

      <div className="mt-6">
        <SubsectionTitle>新聞摘要</SubsectionTitle>
        <ol
          aria-label="新聞摘要的產生步驟"
          className="mt-3 flex list-decimal flex-col gap-2 pl-6 marker:font-bold marker:text-primary"
        >
          {newsSteps.map((step) => (
            <li key={step} className="pl-1">
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-4">
          每篇摘要都標上 <AiSummaryTag />，並附上「閱讀原文（英文）」連結。
        </p>
        {/* 提醒用帶藍的淺色底：紅黃灰只留給判定結果 */}
        <div className="mt-4 rounded-xl bg-surface-sunken p-4 md:px-6">
          <p className="font-bold">AI 摘要可能出錯</p>
          <p className="mt-1">
            AI 可能誤解原文、漏掉重點，或寫錯數字與產品名稱。新聞和你有關時，請點「閱讀原文（英文）」確認，以原文為準。
          </p>
        </div>
      </div>

      <div className="mt-6">
        <SubsectionTitle>最近正被攻擊的軟體</SubsectionTitle>
        <p className="mt-3">
          清單來自美國網路安全機構（CISA）的已被利用漏洞清單。被收錄代表 CISA 已確認有攻擊者正在利用這個軟體的漏洞。
        </p>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-6 marker:text-text-secondary">
          <li>同一個軟體的多個漏洞合併成一項，寫出「幾個漏洞正被利用」和最近一次被收錄的日期。</li>
          <li>Windows、Chrome、iPhone、家用路由器這類一般人常用的軟體與設備排在前面；其他多為公司或機構使用的產品，預設收起來。</li>
          <li>
            標有 <RansomwareTag /> 的，代表其中有漏洞被用來散布勒索軟體。
          </li>
          <li>不列出漏洞編號與技術細節，只告訴你哪些軟體需要注意。</li>
        </ul>
        <p className="mt-4 font-medium">如果你有使用清單上的軟體或設備，請盡快更新到最新版。</p>
      </div>
    </>
  );
}

type Source = { name: string; url: string; description: string };

/** 四個公開資料來源 */
const dataSources: Source[] = [
  {
    name: 'URLhaus',
    url: 'https://urlhaus.abuse.ch/',
    description: '由瑞士的非營利資安組織 abuse.ch 維護，收錄被用來散布惡意程式的網址。',
  },
  {
    name: 'OpenPhish',
    url: 'https://openphish.com/',
    description: '自動偵測並收錄釣魚網站，也就是假冒銀行、購物網站等，騙取帳號密碼的網頁。',
  },
  {
    name: 'The Hacker News',
    url: 'https://thehackernews.com/',
    description: '英文的資安新聞網站。',
  },
  {
    name: 'CISA KEV',
    url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
    description:
      '美國網路安全機構（CISA）公布的 Known Exploited Vulnerabilities 清單，收錄已確認有攻擊者在利用的軟體漏洞。',
  },
];

function SourceList() {
  return (
    <dl className="mt-6 border-t border-text-primary/10">
      {dataSources.map(({ name, url, description }) => (
        <div key={name} className="grid gap-x-8 gap-y-1 border-b border-text-primary/10 py-5 md:grid-cols-[14rem_1fr]">
          <dt className="font-bold">
            <a href={url} target="_blank" rel="noopener noreferrer" className={textLinkClass}>
              {name}
              <span className="sr-only">（在新分頁開啟）</span>
              <ExternalIcon />
            </a>
          </dt>
          <dd>
            <p>{description}</p>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  return (
    // id 是目錄與頁內連結的錨點
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-8">
      <h2 id={`${id}-title`}>{sectionTitle(id)}</h2>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

/** 桌面版左側固定的本頁目錄；手機版不顯示（內容由上往下讀即可） */
function TableOfContents() {
  return (
    <nav aria-label="本頁目錄" className="hidden lg:block">
      <ul className="sticky top-8 flex flex-col gap-1 border-l-2 border-primary/15">
        {sections.map(({ id, title }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className={`${interactiveClass} -ml-0.5 block border-l-2 border-transparent py-1.5 pl-4 text-text-secondary hover:border-primary hover:text-primary-hover focus-visible:outline-primary`}
            >
              {title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * 來源與說明頁：判定順序與三種判定結果、資料來源、隱私與免責聲明。
 * 用詞以 GLOSSARY.md 為準；燈號顏色只出現在判定結果本身。
 */
export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-16">
      <div className="max-w-3xl">
        <h1>來源與說明</h1>
        <p className="mt-4 text-text-secondary">
          網址分析怎麼判定、最新情資怎麼整理、資料從哪裡來、有哪些限制，以及你輸入的網址會怎麼處理。
        </p>
      </div>

      <div className="mt-10 grid gap-12 md:mt-14 lg:grid-cols-[12rem_1fr] lg:gap-16">
        <TableOfContents />

        <div className="flex max-w-3xl min-w-0 flex-col gap-14 md:gap-20">
          <Section id="verdict">
            <p>
              你貼上網址後，系統會依下面的順序檢查，停在第一個符合的步驟。判定結果只有三種：已知惡意、可疑、查無紀錄。
            </p>
            <VerdictLadder />
            <p className="text-sm text-text-secondary">
              分析報告與本頁的範例網址都以 defang 格式顯示：把 <ExampleUrl>http</ExampleUrl> 改成{' '}
              <ExampleUrl>hxxp</ExampleUrl>、把「.」改成 <ExampleUrl>[.]</ExampleUrl>，網址就不會被誤點開。
            </p>
          </Section>

          <Section id="intel">
            <IntelExplanation />
          </Section>

          <Section id="sources">
            <p>本站使用四個公開的資料來源，每日自動更新。網址分析頁與最新情資頁會顯示最近一次的更新時間，超過 48 小時沒有更新時會提醒你。</p>
            <SourceList />
          </Section>

          <Section id="privacy">
            <p className="text-lg font-medium">你輸入的網址不會離開你的瀏覽器。</p>
            <p>
              打開網址分析頁時，瀏覽器會先下載整份惡意網址清單，之後的比對全部在你的裝置上完成。你輸入的網址不會傳給本站或任何第三方，也不會被儲存。
            </p>
          </Section>

          <Section id="disclaimer">
            <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-text-secondary">
              <li>判定結果僅供參考，是依據公開的惡意網址清單與網址本身的可疑特徵比對而來。</li>
              <li>「查無紀錄」不代表網址安全；「可疑」與「已知惡意」也不保證完全準確。</li>
              <li>資料來源由第三方維護，本站無法保證內容完整或即時。</li>
              <li>最新情資的摘要由 AI 產生，可能有誤，請以原文為準。</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
