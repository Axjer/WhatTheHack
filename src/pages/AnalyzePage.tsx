import { useId, useState, type FormEvent } from 'react';
import { analyzeUrl, type AnalysisResult } from '../analysis/analyzeUrl';
import AnalysisReport from '../components/AnalysisReport';
import { maliciousUrls } from '../data/maliciousUrls';
import { buttonClass } from '../styles';

/**
 * 網址分析頁：查詢卡 → 分析報告（簡述）→ 分析報告（詳細）。
 * 查詢卡在最上方（手機上一進來就看得到輸入框）。比對只在瀏覽器內進行；頁面只呈現網址分析模組的輸出。
 */
export default function AnalyzePage() {
  const [input, setInput] = useState('');
  const [analysis, setAnalysis] = useState<{ result: AnalysisResult; at: number } | null>(null);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const result = analysis?.result;
  const notUrl = result?.status === 'not-url';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnalysis({ result: analyzeUrl(input, maliciousUrls), at: Date.now() });
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
            <button type="submit" className={`${buttonClass('primary', 'md')} shrink-0 px-6`}>
              查詢
            </button>
          </div>
          <p id={hintId} className="mt-2 text-sm text-text-secondary">
            只支援網址（<span className="font-mono">http://</span> 或 <span className="font-mono">https://</span>）・
            輸入內容只在你的瀏覽器內比對，不會送出或儲存
          </p>

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
