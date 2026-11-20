import { useEffect, useRef, type ReactNode } from 'react';
import type { Threat, UrlAnalysis, Verdict, WarningSign, WarningSignKind } from '../analysis/analyzeUrl';
import { interactiveClass } from '../styles';

/** 查無紀錄的固定文案（CLAUDE.md），完整呈現、不拆開 */
const noRecordText =
  '目前的資料庫中沒有這個網址的紀錄。這不代表它安全；如果訊息來源可疑，請先向寄件人或 IT 人員確認。';

/** 燈號：顏色＋圖示＋文字標籤（不只靠顏色）。紅、灰只用在判定結果 */
const verdictLight: Record<
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
    iconClass: 'grid size-[1.15em] place-items-center rounded-full bg-unknown text-[0.75em]',
  },
};

const threatLabel: Record<Threat, string> = { phishing: '釣魚', malware: '惡意程式下載' };
const threatPhrase: Record<Threat, string> = { phishing: '騙取帳號密碼', malware: '散布惡意程式' };

/** 符合的警訊的白話說明；host 為 defang 後的網域 */
const warningSignText: Record<WarningSignKind, (sign: WarningSign, host: string) => ReactNode> = {
  'ip-address': () => '這個網址直接使用 IP 位址（一串數字），而不是網站名稱，正常網站很少這樣做。',
  'url-shortener': () => '這是短網址，看不出點開後真正會連到哪裡。',
  punycode: () => '網域含有特殊字元，可能用長得很像的字冒充知名網站。',
  'brand-lookalike': (sign) => {
    const brand = sign.kind === 'brand-lookalike' ? sign.brand : '';
    return `網域裡有「${brand}」的名稱，但不是${brand}的官方網域，可能是冒充。`;
  },
  'at-sign': (_, host) => (
    <>
      網址中有「@」，瀏覽器會忽略 @ 前面的文字，實際連到的是 <span className="font-mono break-all">{host}</span>。
    </>
  ),
};

/** 白話判斷：判定結果相關文案一律嚴肅、直接 */
function judgmentOf(result: UrlAnalysis): string {
  if (result.verdict === 'no-record') return noRecordText;
  if (result.verdict === 'suspicious') return '這個網址不在惡意網址清單中，但有可疑的地方，點開前請先確認：';
  const subject = result.match === 'domain' ? '這個網址所在的網域' : '這個網址';
  const purpose = result.threats.map((threat) => threatPhrase[threat]).join('、');
  return `${subject}曾被通報用來${purpose}，請不要點擊。`;
}

const actionSteps: Record<Verdict, string[]> = {
  'known-malicious': ['不要點擊或轉傳', '回報 IT 或資安窗口', '若已點擊，立即更改密碼'],
  suspicious: [
    '先不要點擊，也不要在連結開啟的頁面輸入帳號密碼',
    '用電話或官方 App 向寄件人或該單位確認',
    '不確定時，交給 IT 或資安窗口判斷',
  ],
  'no-record': [
    '先用電話或其他管道向寄件人確認，不要直接回覆原訊息',
    '不確定時，交給 IT 或資安窗口判斷',
    '不要在連結開啟的頁面輸入帳號密碼',
  ],
};

const DAY = 24 * 60 * 60 * 1000;

/** 「今天」或「N 天前」 */
function daysAgo(iso: string, now: number): string {
  const days = Math.max(0, Math.floor((now - Date.parse(iso)) / DAY));
  return days === 0 ? '今天' : `${days} 天前`;
}

function TimeAgo({ iso, now }: { iso: string | null; now: number }) {
  if (!iso) return <span aria-label="無">—</span>;
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString('zh-TW')}>
      {daysAgo(iso, now)}
    </time>
  );
}

const chipBaseClass = 'inline-flex items-center rounded-full border px-3 py-0.5 text-sm';
const hitChipClass = `${chipBaseClass} border-danger/40 bg-danger-bg text-danger`;
const neutralChipClass = `${chipBaseClass} border-text-primary/15 bg-surface-sunken text-text-secondary`;

const cardClass = 'rounded-xl bg-surface-raised p-5 shadow-sm md:p-6';

/** 一列「標題 … 值」 */
function Row({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <dt className="shrink-0 text-text-secondary">{label}</dt>
      <dd className={`min-w-0 text-right break-all ${mono ? 'font-mono' : ''}`}>{children}</dd>
    </div>
  );
}

type AnalysisReportProps = {
  result: UrlAnalysis;
  /** 計算「N 天前」的基準時間（毫秒） */
  now: number;
};

/**
 * 分析報告：簡述（判定結果＋建議行動）→ 詳細（預設折疊）。
 * 網址一律以 defang 格式顯示，純文字、不可點擊，也不提供複製按鈕。
 */
export default function AnalysisReport({ result, now }: AnalysisReportProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const light = verdictLight[result.verdict];
  const hitCount = result.sources.filter(({ hit }) => hit).length;

  // 每次分析完把焦點移到判定結果：螢幕閱讀器會讀出燈號，手機上也會捲到結果
  useEffect(() => {
    headingRef.current?.focus();
  }, [result]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* 分析報告（簡述） */}
      <div className="grid gap-4 md:grid-cols-[6fr_5fr] md:gap-6">
        <section
          aria-labelledby="analysis-verdict"
          data-verdict={result.verdict}
          className={`flex flex-col gap-4 rounded-xl p-5 md:p-6 ${light.cardClass}`}
        >
          <div>
            <h2
              id="analysis-verdict"
              ref={headingRef}
              tabIndex={-1}
              className={`flex items-center gap-3 text-h2 font-bold outline-none ${light.textClass}`}
            >
              <span className="sr-only">判定結果：</span>
              <span aria-hidden="true" className={light.iconClass}>
                {light.icon}
              </span>
              {light.label}
            </h2>
            <p className={`mt-2 font-medium ${light.textClass}`}>{judgmentOf(result)}</p>
            {result.verdict === 'suspicious' && (
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-6 marker:text-text-secondary">
                {result.warningSigns.map((sign) => (
                  <li key={sign.kind}>{warningSignText[sign.kind](sign, result.parts.host)}</li>
                ))}
              </ul>
            )}
          </div>
          <p className="rounded-lg border border-text-primary/10 bg-surface-raised px-4 py-2.5 font-mono break-all">
            <span className="sr-only">分析的網址：</span>
            {result.defangedUrl}
          </p>
          <ul className="flex flex-wrap gap-2">
            <li className={`${chipBaseClass} ${light.chipClass}`}>
              {hitCount > 0 ? `${hitCount} 個來源命中` : `比對 ${result.sources.length} 個來源，皆未命中`}
            </li>
            {result.lastSeen && (
              <li className={`${chipBaseClass} ${light.chipClass}`}>
                最後發現：
                <TimeAgo iso={result.lastSeen} now={now} />
              </li>
            )}
          </ul>
        </section>

        <section aria-labelledby="analysis-actions" className={cardClass}>
          <h2 id="analysis-actions" className="text-lg font-bold">
            建議行動
          </h2>
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-6 marker:text-text-secondary">
            {actionSteps[result.verdict].map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>

      {/* 分析報告（詳細）：技術細節，預設折疊 */}
      <details className="group">
        <summary
          className={`${interactiveClass} inline-flex cursor-pointer list-none items-center gap-2 rounded-lg py-1 font-medium text-text-secondary hover:text-text-primary focus-visible:outline-primary [&::-webkit-details-marker]:hidden`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-4 transition-transform duration-200 group-open:rotate-90"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path d="M6 3l5 5-5 5" />
          </svg>
          分析報告（詳細）
        </summary>

        <div className="mt-3 flex flex-col gap-4 md:gap-6">
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            <section aria-labelledby="analysis-parts" className={cardClass}>
              <h3 id="analysis-parts" className="text-lg font-bold">
                網址拆解
              </h3>
              <dl className="mt-3">
                <Row label="協定" mono>
                  {result.parts.protocol}
                </Row>
                <Row label="網域" mono>
                  {result.parts.host}
                </Row>
                <Row label="路徑" mono>
                  {result.parts.path}
                </Row>
              </dl>
              {(result.domainReported || result.sharedPlatform) && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {result.domainReported && <li className={hitChipClass}>網域已被通報</li>}
                  {result.sharedPlatform && <li className={neutralChipClass}>共用平台：只比對完整網址</li>}
                </ul>
              )}
              {/* 警訊在分析時自動檢查，只說明符合的項目；「可疑」已在判定卡上說明，這裡只補已知惡意的情況 */}
              {result.verdict === 'known-malicious' && result.warningSigns.length > 0 && (
                <ul className="mt-3 flex list-disc flex-col gap-1 pl-6 text-text-secondary marker:text-text-secondary">
                  {result.warningSigns.map((sign) => (
                    <li key={sign.kind}>{warningSignText[sign.kind](sign, result.parts.host)}</li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="analysis-tags" className={cardClass}>
              <h3 id="analysis-tags" className="text-lg font-bold">
                標籤與時間
              </h3>
              {result.threats.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {result.threats.map((threat) => (
                    <li key={threat} className={`${chipBaseClass} border-text-primary/15 text-text-primary`}>
                      {threatLabel[threat]}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-text-secondary">沒有標籤</p>
              )}
              <dl className="mt-3">
                <Row label="首次發現">
                  <TimeAgo iso={result.firstSeen} now={now} />
                </Row>
                <Row label="最後發現">
                  <TimeAgo iso={result.lastSeen} now={now} />
                </Row>
              </dl>
            </section>
          </div>

          <section aria-labelledby="analysis-sources" className={cardClass}>
            <h3 id="analysis-sources" className="text-lg font-bold">
              來源比對
            </h3>
            <table className="mt-3 w-full text-left">
              <thead className="text-text-secondary">
                <tr className="border-b border-text-primary/10">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    來源
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    結果
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    最後發現
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.sources.map(({ source, hit, lastSeen }) => (
                  <tr key={source} className="border-b border-text-primary/10 last:border-0">
                    <th scope="row" className="py-2.5 pr-4 font-normal">
                      {source}
                    </th>
                    <td className="py-2.5 pr-4">
                      <span className={hit ? hitChipClass : neutralChipClass}>{hit ? '命中' : '未命中'}</span>
                    </td>
                    <td className="py-2.5">
                      <TimeAgo iso={lastSeen} now={now} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-sm text-text-secondary">
              比對在你的瀏覽器內完成，沒有送出任何網路請求。目前使用暫時的測試清單，之後會改為每日更新的惡意網址清單。
            </p>
          </section>
        </div>
      </details>
    </div>
  );
}
