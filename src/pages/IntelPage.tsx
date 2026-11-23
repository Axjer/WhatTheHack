import { useEffect, useId, useState } from 'react';
import type { NewsFile, NewsItem } from '../data/news';
import { loadNews } from '../data/loadNews';
import { textLinkClass } from '../styles';
import { DAILY_UPDATE_TIME, formatRelativeDay, formatTaipeiTime, isStale } from '../time';

/** 新聞來源（目前只有一個；標在區塊說明與卡片底部） */
const NEWS_SOURCE = 'The Hacker News';

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

/** 直式卡片：撐滿格子高度，讓同一排的卡片等高 */
const cardClass = 'flex h-full flex-col rounded-xl bg-surface-raised p-5 shadow-sm md:p-6';
/** 卡片底部：來源、日期與原文連結 */
const cardFooterClass =
  'mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-text-primary/10 pt-4 text-sm';

/** 載入中的骨架屏：三張直式卡片，形狀與真實版面相同 */
function NewsSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-4 lg:grid-cols-3 lg:gap-6">
      {[0, 1, 2].map((key) => (
        <div key={key} className={cardClass}>
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton mt-4 h-6 w-4/5" />
          <div className="skeleton mt-4 h-4 w-full" />
          <div className="skeleton mt-2 h-4 w-full" />
          <div className="skeleton mt-2 mb-6 h-4 w-2/3" />
          <div className={cardFooterClass}>
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NewsCard({ item, now }: { item: NewsItem; now: number }) {
  const headingId = useId();
  return (
    <article aria-labelledby={headingId} className={cardClass}>
      {/* AI 摘要的標示：主色字＋帶藍淺底，不用燈號顏色 */}
      <span className="self-start rounded-full bg-surface-sunken px-3 py-0.5 text-sm font-medium text-primary">
        AI 摘要
      </span>
      <h3 id={headingId} className="mt-4 text-xl leading-snug font-bold">
        {item.headline}
      </h3>
      <p className="mt-3 mb-6">{item.summary}</p>
      {/* 底部對齊：三張卡片摘要長短不同，來源與連結仍排在同一條線上 */}
      <div className={cardFooterClass}>
        <span className="text-text-secondary">
          {NEWS_SOURCE} · <time dateTime={item.publishedAt}>{formatRelativeDay(item.publishedAt, now)}</time>
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
 * 最新情資頁：The Hacker News 重點新聞的 AI 白話摘要。
 * 桌面版三張直式卡片並排，手機版上下排列。不使用燈號顏色。
 */
export default function IntelPage() {
  const [news, setNews] = useState<NewsFile | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const loading = !news && !loadFailed;
  const now = Date.now();

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
        <p className="mt-4 text-text-secondary">用白話整理最近的資安新聞，{DAILY_UPDATE_TIME}更新。</p>
        {news?.updatedAt && (
          <p className="mt-1 text-sm text-text-secondary">情資更新於：{formatTaipeiTime(news.updatedAt)}</p>
        )}
        {/* 提醒用主要文字色與帶藍的淺色底：紅黃灰只留給判定結果 */}
        {news?.updatedAt && isStale(news.updatedAt, now) && (
          <p className="mt-2 rounded-lg bg-surface-sunken px-3 py-2 text-sm">
            情資已超過 48 小時沒有更新，內容可能不是最新的。
          </p>
        )}
      </div>

      <section aria-label="資安新聞摘要" aria-busy={loading} className="mt-10">
        {loading && <NewsSkeleton />}
        {loadFailed && (
          <p role="alert" className="max-w-4xl rounded-lg bg-surface-sunken px-4 py-3">
            無法載入最新情資，請重新整理頁面再試一次。
          </p>
        )}
        {news && !news.items.length && (
          <p className="max-w-4xl rounded-lg bg-surface-sunken px-4 py-3">
            目前還沒有整理好的新聞。{DAILY_UPDATE_TIME}會自動更新，請稍後再回來看看。
          </p>
        )}
        {news && news.items.length > 0 && (
          <>
            <NewsJsonLd items={news.items} />
            <h2>{news.items.length} 篇焦點新聞</h2>
            <p className="mt-1 text-text-secondary">整理自 {NEWS_SOURCE}，由 AI 改寫成白話摘要</p>
            <ul className="mt-6 grid gap-4 lg:grid-cols-3 lg:gap-6">
              {news.items.map((item) => (
                <li key={item.url}>
                  <NewsCard item={item} now={now} />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-text-secondary">AI 摘要可能有誤，請以原文為準。</p>
          </>
        )}
      </section>
    </div>
  );
}
