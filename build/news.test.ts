// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { NewsFile } from '../src/data/news.ts';
import { buildNews, extractArticleText, parseFeed, selectTopItems, type FeedItem } from './news.ts';

const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>The Hacker News</title>
<item><title>Hackers Exploit Critical ASP.NET Anti-CSRF Library Flaw</title><description><![CDATA[Cybersecurity researchers have urged users to discontinue using a legacy library &amp; more.]]></description><link>https://thehackernews.com/2026/11/hackers-exploit-critical-aspnet-anti.html</link><pubDate>Mon, 23 Nov 2026 14:41:56 +0530</pubDate></item>
<item><title><![CDATA[New "Quote" Malware Targets Banks]]></title><description><![CDATA[A new malware strain...]]></description><link>https://thehackernews.com/2026/11/new-quote-malware.html</link><pubDate>Sun, 22 Nov 2026 09:00:00 +0000</pubDate></item>
</channel></rss>`;

describe('parseFeed', () => {
  it('依序取出每篇的標題、連結、發布時間（ISO）與摘錄，並解碼 HTML 字元', () => {
    expect(parseFeed(feedXml)).toEqual([
      {
        title: 'Hackers Exploit Critical ASP.NET Anti-CSRF Library Flaw',
        url: 'https://thehackernews.com/2026/11/hackers-exploit-critical-aspnet-anti.html',
        publishedAt: '2026-11-23T09:11:56.000Z',
        excerpt: 'Cybersecurity researchers have urged users to discontinue using a legacy library & more.',
      },
      {
        title: 'New "Quote" Malware Targets Banks',
        url: 'https://thehackernews.com/2026/11/new-quote-malware.html',
        publishedAt: '2026-11-22T09:00:00.000Z',
        excerpt: 'A new malware strain...',
      },
    ]);
  });

  it('不是 RSS（例如錯誤頁）→ 空陣列', () => {
    expect(parseFeed('<html><title>503</title></html>')).toEqual([]);
  });
});

describe('extractArticleText', () => {
  const articleHtml = `<html><body>
<div class='postmeta'><span class='author'>Ravie Lakshmanan</span></div>
<p>Navigation text that is not part of the article.</p>
<div class='articlebody clear cf' id='articlebody'><div class="separator"><img src="x.jpg"/></div>
<p>Cybersecurity researchers have urged users to stop using <a href="#">Idunno.AntiCsrf</a>.</p>
<p>The flaw is tracked as CVE-2026-131914 &amp; rated 9.3.</p>
<ul><li>Replace the library.</li><li>Rotate &lt;machineKey&gt; secrets.</li></ul>
<div class='stophere'></div>
<div class='cf note-b'><p>Found this article interesting? Follow us on social media.</p></div>
</div></body></html>`;

  it('只取內文區塊的段落與清單項目，去掉標籤並解碼，到文末推廣段落之前為止', () => {
    expect(extractArticleText(articleHtml)).toBe(
      [
        'Cybersecurity researchers have urged users to stop using Idunno.AntiCsrf.',
        'The flaw is tracked as CVE-2026-131914 & rated 9.3.',
        'Replace the library.',
        'Rotate <machineKey> secrets.',
      ].join('\n\n'),
    );
  });

  it('找不到內文區塊 → 空字串', () => {
    expect(extractArticleText('<html><p>Not an article</p></html>')).toBe('');
  });
});

describe('buildNews', () => {
  const now = new Date('2026-11-23T00:00:00Z');
  const feed = (n: number): FeedItem[] =>
    Array.from({ length: n }, (_, i) => ({
      title: `Article ${i + 1}`,
      url: `https://thehackernews.com/2026/11/article-${i + 1}.html`,
      publishedAt: `2026-11-${String(22 - i).padStart(2, '0')}T00:00:00.000Z`,
      excerpt: `Excerpt ${i + 1}`,
    }));
  /** 假的摘要函式：記錄被呼叫的文章，回傳固定格式的摘要 */
  function fakeSummarize(fails: string[] = []) {
    const called: string[] = [];
    const summarize = async (item: FeedItem) => {
      called.push(item.title);
      return fails.includes(item.title) ? null : { headline: `標題 ${item.title}`, summary: `摘要 ${item.title}` };
    };
    return { summarize, called };
  }

  it('取最新的幾篇，各自產生摘要，連同原文標題、網址與發布時間存下', async () => {
    const { summarize } = fakeSummarize();
    const news = await buildNews({ items: feed(3), previous: null, now, summarize, limit: 2 });

    expect(news).toEqual({
      updatedAt: '2026-11-23T00:00:00.000Z',
      items: [
        {
          headline: '標題 Article 1',
          summary: '摘要 Article 1',
          title: 'Article 1',
          url: 'https://thehackernews.com/2026/11/article-1.html',
          publishedAt: '2026-11-22T00:00:00.000Z',
        },
        {
          headline: '標題 Article 2',
          summary: '摘要 Article 2',
          title: 'Article 2',
          url: 'https://thehackernews.com/2026/11/article-2.html',
          publishedAt: '2026-11-21T00:00:00.000Z',
        },
      ],
    });
  });

  it('上一份已有摘要的文章直接沿用，不再呼叫摘要', async () => {
    const previous: NewsFile = {
      updatedAt: '2026-11-22T00:00:00.000Z',
      items: [
        {
          headline: '昨天的標題',
          summary: '昨天的摘要',
          title: 'Article 2',
          url: 'https://thehackernews.com/2026/11/article-2.html',
          publishedAt: '2026-11-21T00:00:00.000Z',
        },
      ],
    };
    const { summarize, called } = fakeSummarize();
    const news = await buildNews({ items: feed(2), previous, now, summarize, limit: 2 });

    expect(called).toEqual(['Article 1']);
    expect(news?.items.map((item) => item.headline)).toEqual(['標題 Article 1', '昨天的標題']);
  });

  it('部分文章摘要失敗、也沒有上一份 → 只放成功的', async () => {
    const { summarize } = fakeSummarize(['Article 2']);
    const news = await buildNews({ items: feed(3), previous: null, now, summarize, limit: 3 });
    expect(news?.items.map((item) => item.title)).toEqual(['Article 1', 'Article 3']);
  });

  it('部分文章摘要失敗 → 用前一天的文章補足篇數，依發布時間由新到舊', async () => {
    const previous: NewsFile = {
      updatedAt: '2026-11-22T00:00:00.000Z',
      items: [
        {
          headline: '前天的標題',
          summary: '前天的摘要',
          title: 'Older article',
          url: 'https://thehackernews.com/2026/11/older.html',
          publishedAt: '2026-11-15T00:00:00.000Z',
        },
        {
          headline: '昨天的標題',
          summary: '昨天的摘要',
          title: 'Old article',
          url: 'https://thehackernews.com/2026/11/old.html',
          publishedAt: '2026-11-18T00:00:00.000Z',
        },
      ],
    };
    const { summarize } = fakeSummarize(['Article 2', 'Article 3']);
    const news = await buildNews({ items: feed(3), previous, now, summarize, limit: 3 });

    expect(news?.updatedAt).toBe('2026-11-23T00:00:00.000Z');
    expect(news?.items.map((item) => item.title)).toEqual(['Article 1', 'Old article', 'Older article']);
  });

  it('這次的篇數已足夠 → 不放上一份的文章，即使上一份的比較新', async () => {
    const previous: NewsFile = {
      updatedAt: '2026-11-22T00:00:00.000Z',
      items: [
        {
          headline: '較新的舊摘要',
          summary: '摘要',
          title: 'Newer old article',
          url: 'https://thehackernews.com/2026/11/newer-old.html',
          publishedAt: '2026-11-22T23:00:00.000Z',
        },
      ],
    };
    const { summarize } = fakeSummarize();
    const news = await buildNews({ items: feed(3), previous, now, summarize, limit: 3 });
    expect(news?.items.map((item) => item.title)).toEqual(['Article 1', 'Article 2', 'Article 3']);
  });

  describe('產生摘要失敗時保留前一天的資料', () => {
    const previous: NewsFile = {
      updatedAt: '2026-11-22T00:00:00.000Z',
      items: [
        {
          headline: '昨天的標題',
          summary: '昨天的摘要',
          title: 'Old article',
          url: 'https://thehackernews.com/2026/11/old.html',
          publishedAt: '2026-11-21T00:00:00.000Z',
        },
      ],
    };

    it('需要新摘要的文章全部失敗 → 整份沿用上一份，更新時間不變', async () => {
      const { summarize } = fakeSummarize(['Article 1', 'Article 2']);
      expect(await buildNews({ items: feed(2), previous, now, summarize, limit: 2 })).toEqual(previous);
    });

    it('RSS 沒有任何文章 → 整份沿用上一份', async () => {
      const { summarize } = fakeSummarize();
      expect(await buildNews({ items: [], previous, now, summarize, limit: 2 })).toEqual(previous);
    });

    it('全部失敗且沒有上一份 → 不產生新聞檔', async () => {
      const { summarize } = fakeSummarize(['Article 1']);
      expect(await buildNews({ items: feed(1), previous: null, now, summarize, limit: 1 })).toBeNull();
    });
  });
});

describe('selectTopItems：從過去 24 小時的新聞挑出最重要的幾篇', () => {
  const now = new Date('2026-11-23T00:00:00Z');
  /** 每篇間隔 4 小時，由新到舊：第 1 篇 1 小時前、第 6 篇 21 小時前、第 7 篇 25 小時前 */
  const feed: FeedItem[] = Array.from({ length: 7 }, (_, i) => ({
    title: `Article ${i + 1}`,
    url: `https://thehackernews.com/2026/11/article-${i + 1}.html`,
    publishedAt: new Date(now.getTime() - (1 + 4 * i) * 60 * 60 * 1000).toISOString(),
    excerpt: `Excerpt ${i + 1}`,
  }));
  const titles = (items: FeedItem[]) => items.map((item) => item.title);

  it('只把過去 24 小時內的新聞交給挑選，挑中的依發布時間由新到舊排', async () => {
    const offered: string[][] = [];
    const picked = await selectTopItems({
      items: feed,
      now,
      limit: 3,
      choose: async (candidates) => {
        offered.push(titles(candidates));
        return [4, 0, 2];
      },
    });
    expect(offered).toEqual([['Article 1', 'Article 2', 'Article 3', 'Article 4', 'Article 5', 'Article 6']]);
    expect(titles(picked)).toEqual(['Article 1', 'Article 3', 'Article 5']);
  });

  it('24 小時內不超過指定篇數 → 全部收下，不必挑選', async () => {
    let called = false;
    const picked = await selectTopItems({
      items: feed.slice(4),
      now,
      limit: 3,
      choose: async () => {
        called = true;
        return [0];
      },
    });
    expect(titles(picked)).toEqual(['Article 5', 'Article 6']);
    expect(called).toBe(false);
  });

  it('24 小時內沒有新聞 → 空陣列', async () => {
    const picked = await selectTopItems({ items: feed.slice(6), now, limit: 3, choose: async () => [0] });
    expect(picked).toEqual([]);
  });

  it('挑選失敗 → 改取最新的幾篇', async () => {
    const picked = await selectTopItems({ items: feed, now, limit: 3, choose: async () => null });
    expect(titles(picked)).toEqual(['Article 1', 'Article 2', 'Article 3']);
  });

  it('挑選結果有超出範圍或重複的編號 → 忽略，不足的篇數用最新的補上', async () => {
    const picked = await selectTopItems({ items: feed, now, limit: 3, choose: async () => [5, 5, 99, -1] });
    expect(titles(picked)).toEqual(['Article 1', 'Article 2', 'Article 6']);
  });

  it('挑太多 → 只取前面指定的篇數', async () => {
    const picked = await selectTopItems({ items: feed, now, limit: 3, choose: async () => [5, 4, 3, 2, 1] });
    expect(titles(picked)).toEqual(['Article 4', 'Article 5', 'Article 6']);
  });
});
