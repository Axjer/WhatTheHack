import { useEffect, useId, useState, type FormEvent } from 'react';
import { analyzeUrl, listSources, type AnalysisResult, type MaliciousList } from '../analysis/analyzeUrl';
import AnalysisReport from '../components/AnalysisReport';
import { loadMaliciousList } from '../data/loadMaliciousList';
import { buttonClass, disableableClass } from '../styles';

/** 清單超過這個時間沒更新就提醒 */
const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

/** 清單的更新時間取最舊的來源：整份清單只算更新到最慢的那個來源 */
function oldestUpdate(list: MaliciousList): string | null {
  const times = listSources.flatMap((source) => list.sourceUpdatedAt[source] ?? []);
  return times.length ? times.reduce((a, b) => (Date.parse(b) < Date.parse(a) ? b : a)) : null;
}

/** 超過 48 小時沒更新（或從未成功更新）的來源 */
function staleSourcesOf(list: MaliciousList, now: number): string[] {
  return listSources.filter((source) => {
    const updatedAt = list.sourceUpdatedAt[source];
    return !updatedAt || now - Date.parse(updatedAt) > STALE_AFTER_MS;
  });
}

/** 以台灣時間格式化為 YYYY-MM-DD HH:MM */
function formatTaipeiTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`;
}

/**
 * 網址分析頁：查詢卡 → 分析報告（簡述）→ 分析報告（詳細）。
 * 查詢卡在最上方（手機上一進來就看得到輸入框）。比對只在瀏覽器內進行；頁面只呈現網址分析模組的輸出。
 */
export default function AnalyzePage() {
  const [input, setInput] = useState('');
  const [analysis, setAnalysis] = useState<{ result: AnalysisResult; at: number } | null>(null);
  const [list, setList] = useState<MaliciousList | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const result = analysis?.result;
  const notUrl = result?.status === 'not-url';
  const listUpdatedAt = list && oldestUpdate(list);
  const staleSources = list ? staleSourcesOf(list, Date.now()) : [];

  useEffect(() => {
    let active = true;
    loadMaliciousList().then(
      (loaded) => {
        if (active) setList(loaded);
      },
      () => {
        if (active) setLoadFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!list) return;
    setAnalysis({ result: analyzeUrl(input, list.entries), at: Date.now() });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-12">
      <section aria-labelledby="analyze-title" className="rounded-xl bg-surface-raised p-5 shadow-sm md:p-6">
        <h1 id="analyze-title">網址分析</h1>
        <p className="mt-1 text-text-secondary">貼上可疑網址，我們會比對公開的惡意網址資料</p>

        <form onSubmit={handleSubmit} noValidate className="mt-4">
          <label htmlFor={inputId} className="sr-only">
            要查詢的網址
          </label>
          <div className="flex gap-3">
            <input
              id={inputId}
              type="text"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="https://example.com"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              aria-invalid={notUrl}
              aria-describedby={notUrl ? `${errorId} ${hintId}` : hintId}
              className="min-w-0 flex-1 rounded-lg border border-text-primary/20 bg-surface px-4 py-2.5 font-mono transition duration-200 placeholder:text-text-secondary hover:border-text-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            <button
              type="submit"
              disabled={!list}
              className={`${buttonClass('primary', 'md')} ${disableableClass} shrink-0 px-6`}
            >
              查詢
            </button>
          </div>
          <p id={hintId} className="mt-2 text-sm text-text-secondary">
            只支援網址（<span className="font-mono">http://</span> 或 <span className="font-mono">https://</span>）・
            輸入內容只在你的瀏覽器內比對，不會送出或儲存
          </p>
          {listUpdatedAt && (
            <p className="mt-1 text-sm text-text-secondary">清單更新於：{formatTaipeiTime(listUpdatedAt)}</p>
          )}
          {/* 提醒用主要文字色與帶藍的淺色底：紅黃灰只留給判定結果 */}
          {loadFailed && (
            <p role="alert" className="mt-2 rounded-lg bg-surface-sunken px-3 py-2 text-sm">
              無法載入惡意網址清單，請重新整理頁面再試一次。
            </p>
          )}
          {staleSources.length > 0 && (
            <p className="mt-2 rounded-lg bg-surface-sunken px-3 py-2 text-sm">
              {staleSources.join('、')} 已超過 48 小時沒有更新，判定結果可能不夠新。
            </p>
          )}

          {/* 不是網址：只給提示、不給燈號；用主要文字色，紅黃灰只留給判定結果 */}
          <div aria-live="polite">
            {notUrl && (
              <div id={errorId} className="mt-4 flex gap-3 rounded-lg bg-surface-sunken p-4">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="mt-1 size-5 shrink-0 text-primary"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <circle cx="10" cy="10" r="8" />
                  <path d="M10 9v5M10 6v.01" strokeLinecap="round" />
                </svg>
                <div>
                  <p className="font-bold">請輸入網址</p>
                  <p className="mt-1 text-text-secondary">
                    一次只能查詢一個網址。請只貼網址本身（例如{' '}
                    <span className="font-mono">https://example.com</span>），不要包含其他文字。
                  </p>
                </div>
              </div>
            )}
          </div>
        </form>
      </section>

      {result?.status === 'analyzed' && <AnalysisReport result={result} now={analysis!.at} />}
    </div>
  );
}
