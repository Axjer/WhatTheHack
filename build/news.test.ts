// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { NewsFile } from '../src/data/news.ts';
import { buildNews, extractArticleText, parseFeed, type FeedItem } from './news.ts';

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
