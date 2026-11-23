/**
 * 最新情資的新聞整理模組：解析 The Hacker News 的 RSS、挑選焦點新聞、抽出文章全文、組成新聞摘要檔。
 * 純函式，不連網、不呼叫 API；抓取與呼叫 Gemini 由 update-news.ts 負責，挑選與摘要函式由外部傳入。
 */

import type { NewsFile, NewsItem, NewsSummary } from '../src/data/news.ts';

type BuildNewsInput = {
  /** RSS 解析出的文章，由新到舊 */
  items: FeedItem[];
  /** 上一份新聞檔；已有摘要的文章直接沿用，失敗時整份保留 */
  previous: NewsFile | null;
  now: Date;
  /** 產生一篇文章的白話摘要；失敗回傳 null */
  summarize: (item: FeedItem) => Promise<NewsSummary | null>;
  /** 最多收幾篇 */
  limit: number;
};

/**
 * 組成新聞摘要檔：取最新的 limit 篇，上一份已有摘要的沿用，其餘逐篇產生摘要。
 * 需要新摘要的文章全部失敗（例如沒有 API key 或 API 故障）時，整份沿用上一份，不覆蓋前一天的資料。
 */
export async function buildNews({ items, previous, now, summarize, limit }: BuildNewsInput): Promise<NewsFile | null> {
  const previousByUrl = new Map((previous?.items ?? []).map((item) => [item.url, item]));
  const latest = items.slice(0, limit);
  const news: NewsItem[] = [];
  let needed = 0;
  let generated = 0;
  // 逐篇依序產生，避免同時大量呼叫 API
  for (const item of latest) {
    const reused = previousByUrl.get(item.url);
    if (reused) {
      news.push(reused);
      continue;
    }
    needed++;
    const summary = await summarize(item);
    if (!summary) continue;
    generated++;
    news.push({ ...summary, title: item.title, url: item.url, publishedAt: item.publishedAt });
  }
  if (!news.length || (needed > 0 && generated === 0)) return previous;
  // 部分失敗時不讓頁面變少：用上一份的文章補足篇數，再依發布時間由新到舊排
  const included = new Set(news.map((item) => item.url));
  const filler = (previous?.items ?? []).filter((item) => !included.has(item.url));
  const merged = [...news, ...filler]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit);
  return { updatedAt: now.toISOString(), items: merged };
}

/** 只挑這段時間內發布的新聞 */
const SELECTION_WINDOW_MS = 24 * 60 * 60 * 1000;

type SelectTopItemsInput = {
  /** RSS 解析出的文章，由新到舊 */
  items: FeedItem[];
  now: Date;
  /** 最多挑幾篇 */
  limit: number;
  /** 從候選文章挑出最重要的幾篇，回傳候選陣列的索引（依重要性排）；失敗回傳 null */
  choose: (candidates: FeedItem[]) => Promise<number[] | null>;
};

/**
 * 從過去 24 小時內的新聞挑出最重要的 limit 篇，依發布時間由新到舊排。
 * 不超過 limit 篇就全收、不必挑選；挑選失敗或結果不足時，用最新的補足。
 */
export async function selectTopItems({ items, now, limit, choose }: SelectTopItemsInput): Promise<FeedItem[]> {
  const since = now.getTime() - SELECTION_WINDOW_MS;
  const candidates = items.filter((item) => {
    const published = Date.parse(item.publishedAt);
    return published > since && published <= now.getTime();
  });
  if (candidates.length <= limit) return candidates;

  const picks = new Set<number>();
  for (const index of (await choose(candidates)) ?? []) {
    if (picks.size >= limit) break;
    if (Number.isInteger(index) && index >= 0 && index < candidates.length) picks.add(index);
  }
  // 挑選失敗或不足：依序用最新的補上
  for (let index = 0; picks.size < limit; index++) picks.add(index);
  return candidates.filter((_, index) => picks.has(index));
}

/** RSS 裡的一篇新聞 */
export type FeedItem = {
  title: string;
  url: string;
  /** ISO 8601 */
  publishedAt: string;
  /** RSS 的摘錄（只有開頭幾百字） */
  excerpt: string;
};

/** 解析 RSS；不是 RSS 時回傳空陣列 */
export function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  for (const [, block] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const title = tagText(block, 'title');
    const url = tagText(block, 'link');
    const published = Date.parse(tagText(block, 'pubDate'));
    if (!title || !url || Number.isNaN(published)) continue;
    items.push({
      title,
      url,
      publishedAt: new Date(published).toISOString(),
      excerpt: tagText(block, 'description'),
    });
  }
  return items;
}

/**
 * 從 The Hacker News 文章頁抽出全文：內文區塊（id='articlebody'）裡的段落與清單項目，
 * 到文末的推廣段落（stophere / Found this article interesting?）之前為止。段落之間空一行。
 * 找不到內文區塊時回傳空字串。
 */
export function extractArticleText(html: string): string {
  const start = html.search(/id=['"]articlebody['"]/);
  if (start < 0) return '';
  const body = html.slice(start);
  const end = body.search(/class=['"]stophere['"]|Found this article interesting/);
  const content = end < 0 ? body : body.slice(0, end);
  return [...content.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)]
    .map(([, , inner]) => decodeEntities(inner.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

/** 取出標籤內的文字：去掉 CDATA 包裝、HTML 標籤，並解碼 HTML 字元 */
function tagText(block: string, tag: string): string {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block);
  if (!match) return '';
  const raw = match[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
  return decodeEntities(raw.replace(/<[^>]+>/g, '')).trim();
}

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === '#') {
      const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
  });
}
