import { useEffect, useId, useState } from 'react';
import type { NewsFile, NewsItem } from '../data/news';
import { loadNews } from '../data/loadNews';
import { textLinkClass } from '../styles';
import { formatTaipeiTime } from '../time';

/** 台灣時間的日期，用來把同一天的新聞歸在一起 */
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' });
const monthDayFormat = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric' });
const weekdayFormat = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', weekday: 'short' });

type DayGroup = { day: string; items: NewsItem[] };

/** 依發布日期（台灣時間）分組，保持由新到舊 */
function groupByDay(items: NewsItem[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const item of items) {
    const day = dayFormat.format(new Date(item.publishedAt));
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  }
  return groups;
}

/**
 * 摘要區塊的結構化資料（schema.org NewsArticle），讓搜尋引擎認得這些是新聞摘要。
 * 摘要是 AI 產生的文字：序列化時把 < 轉成 <，內容不變，但永遠不會出現 </script> 跳出標籤。
 */
function NewsJsonLd({ items }: { items: NewsItem[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@graph': items.map((item) => ({
      '@type': 'NewsArticle',
      headline: item.headline,
      description: item.summary,
      datePublished: item.publishedAt,
      inLanguage: 'zh-TW',
      isBasedOn: item.url,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

/** 開新分頁的外部連結圖示 */
function ExternalIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="ml-1 inline size-3.5 align-[-0.1em]" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 3h4v4M13 3 7 9M11 9.5V13H3V5h3.5" />
    </svg>
  );
}

/** 載入中的骨架屏：一個日期欄加兩張卡片，形狀與真實版面相同 */
function NewsSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-3 md:grid-cols-[6rem_minmax(0,1fr)] md:gap-8">
      <div className="flex gap-2 md:flex-col md:pt-5">
        <div className="skeleton h-7 w-16" />
        <div className="skeleton h-4 w-8" />
      </div>
      <div className="flex flex-col gap-4">
        {[0, 1].map((key) => (
          <div key={key} className="rounded-xl bg-surface-raised p-5 shadow-sm md:p-6">
            <div className="skeleton h-6 w-3/4" />
            <div className="skeleton mt-4 h-4 w-full" />
            <div className="skeleton mt-2 h-4 w-full" />
            <div className="skeleton mt-2 h-4 w-2/3" />
            <div className="mt-5 flex justify-between">
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-5 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const headingId = useId();
  return (
    <article aria-labelledby={headingId} className="rounded-xl bg-surface-raised p-5 shadow-sm md:p-6">
      <h3 id={headingId} className="text-xl leading-snug font-bold">
        {item.headline}
      </h3>
      <p className="mt-3">{item.summary}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        {/* AI 摘要的標示：主色字＋帶藍淺底，不用燈號顏色 */}
        <span className="inline-flex items-center rounded-full bg-surface-sunken px-3 py-0.5 font-medium text-primary">
          AI 摘要
        </span>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className={textLinkClass}>
          閱讀原文（英文）
          <span className="sr-only">：{item.title}，在新分頁開啟</span>
          <ExternalIcon />
        </a>
      </div>
    </article>
  );
}

/**
 * 最新情資頁：The Hacker News 重點新聞的 AI 白話摘要，依發布日期分組。
 * 新聞有時間順序，所以用左側日期欄的閱讀清單，而不是卡片網格。不使用燈號顏色。
 */
export default function IntelPage() {
  const [news, setNews] = useState<NewsFile | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const loading = !news && !loadFailed;

  useEffect(() => {
    let active = true;
    loadNews().then(
      (loaded) => {
        if (active) setNews(loaded);
      },
      () => {
        if (active) setLoadFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-16">
      <div className="max-w-4xl">
        <h1>最新情資</h1>
        <p className="mt-4 text-text-secondary">
          用白話整理最近的資安新聞，每天早上 8 點更新。摘要由 AI 根據原文產生，細節請以原文為準。
        </p>
        {news?.updatedAt && (
          <p className="mt-1 text-sm text-text-secondary">情資更新於：{formatTaipeiTime(news.updatedAt)}</p>
        )}

        <section aria-labelledby="news-title" aria-busy={loading} className="mt-10">
          <h2 id="news-title" className="sr-only">
            資安新聞摘要
          </h2>
          {loading && <NewsSkeleton />}
          {loadFailed && (
            <p role="alert" className="rounded-lg bg-surface-sunken px-4 py-3">
              無法載入最新情資，請重新整理頁面再試一次。
            </p>
          )}
          {news && !news.items.length && (
            <p className="rounded-lg bg-surface-sunken px-4 py-3">
              目前還沒有整理好的新聞。每天早上 8 點會自動更新，請稍後再回來看看。
            </p>
          )}
          {news && news.items.length > 0 && <NewsJsonLd items={news.items} />}
          {news && news.items.length > 0 && (
            <ol className="flex flex-col gap-10">
              {groupByDay(news.items).map(({ day, items }) => {
                const date = new Date(items[0].publishedAt);
                return (
                  <li key={day} className="grid gap-3 md:grid-cols-[6rem_minmax(0,1fr)] md:gap-8">
                    {/* 日期欄：同一天的新聞只標一次日期 */}
                    <time dateTime={day} className="flex items-baseline gap-2 md:flex-col md:gap-0 md:pt-5">
                      <span className="text-2xl font-bold tabular-nums">{monthDayFormat.format(date)}</span>
                      <span className="text-sm text-text-secondary">{weekdayFormat.format(date)}</span>
                    </time>
                    <div className="flex flex-col gap-4">
                      {items.map((item) => (
                        <NewsCard key={item.url} item={item} />
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
