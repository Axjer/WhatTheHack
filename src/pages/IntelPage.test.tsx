import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KevFile } from '../data/kev';
import type { NewsFile } from '../data/news';
import IntelPage from './IntelPage';

/** 假的新聞檔（取代每日更新的新聞摘要檔）；pending 時永遠不會載入完成 */
let fakeNews: NewsFile | 'pending' | 'fails';

vi.mock('../data/loadNews', () => ({
  loadNews: () => {
    if (fakeNews === 'pending') return new Promise(() => {});
    if (fakeNews === 'fails') return Promise.reject(new Error('HTTP 404'));
    return Promise.resolve(fakeNews);
  },
}));

/** 假的 KEV 統計檔 */
let fakeKev: KevFile | 'fails';

vi.mock('../data/loadKev', () => ({
  loadKev: () => (fakeKev === 'fails' ? Promise.reject(new Error('HTTP 404')) : Promise.resolve(fakeKev)),
}));

/** 剛更新過的 KEV 統計：daily 是 11/17 到 11/23 每天的筆數 */
function freshKev(counts: number[]): KevFile {
  return {
    updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    daily: counts.map((count, index) => ({ date: `2026-11-${17 + index}`, count })),
  };
}

const twoArticles: NewsFile = {
  updatedAt: '2026-11-23T00:00:00.000Z',
  items: [
    {
      headline: 'ASP.NET 舊套件漏洞遭駭客利用',
      summary: '一個已停止維護的 ASP.NET 套件有嚴重漏洞，駭客已經在利用。還在用的公司應該盡快換掉。',
      title: 'Hackers Exploit Critical ASP.NET Anti-CSRF Library Flaw',
      url: 'https://thehackernews.com/2026/11/hackers-exploit-critical-aspnet-anti.html',
      publishedAt: '2026-11-23T09:11:56.000Z',
    },
    {
      headline: '新型惡意程式鎖定銀行',
      summary: '研究人員發現一種新的惡意程式專門攻擊銀行。它會偽裝成報價單寄到員工信箱。',
      title: 'New Malware Targets Banks',
      url: 'https://thehackernews.com/2026/11/new-malware.html',
      publishedAt: '2026-11-22T09:00:00.000Z',
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <IntelPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  fakeNews = twoArticles;
  fakeKev = freshKev([0, 0, 0, 0, 0, 0, 0]);
});

describe('最新情資頁：已被利用漏洞趨勢（CISA KEV）', () => {
  const trend = () => screen.findByRole('region', { name: '已被利用漏洞趨勢' });

  it('長條圖逐日列出近 7 天的新增筆數，下方只標日期', async () => {
    fakeKev = freshKev([1, 0, 3, 2, 0, 0, 4]);
    renderPage();
    const section = await trend();
    expect(within(section).getByRole('heading', { name: '近 7 天新增已被利用漏洞' })).toBeInTheDocument();
    expect(within(section).getByRole('img')).toHaveAccessibleName(
      '近 7 天每日新增已被利用漏洞：11/17 1 筆、11/18 0 筆、11/19 3 筆、11/20 2 筆、11/21 0 筆、11/22 0 筆、11/23 4 筆',
    );
    expect(section).toHaveTextContent('11/17');
    expect(section).not.toHaveTextContent(/[一二三四五六日]（|星期|週/);
  });

  it('不放結論句', async () => {
    fakeKev = freshKev([1, 0, 3, 2, 0, 0, 4]);
    renderPage();
    expect(await trend()).not.toHaveTextContent('結論');
  });

  it('說明資料來源與更新頻率；不顯示 CVE 編號', async () => {
    fakeKev = freshKev([1, 0, 3, 2, 0, 0, 4]);
    renderPage();
    const section = await trend();
    expect(section).toHaveTextContent('資料每日統計一次，圖表數據來自 CISA 已被利用漏洞清單。');
    expect(section).not.toHaveTextContent(/CVE-/);
  });

  it('趨勢圖在新聞之後', async () => {
    fakeKev = freshKev([1, 0, 3, 2, 0, 0, 4]);
    renderPage();
    const section = await trend();
    const newsHeading = await screen.findByRole('heading', { name: '2 篇焦點新聞' });
    expect(newsHeading.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('超過 48 小時沒更新 → 照樣顯示，並提醒數字可能不是最新的', async () => {
    fakeKev = { ...freshKev([1, 0, 3, 2, 0, 0, 4]), updatedAt: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString() };
    renderPage();
    expect(await trend()).toHaveTextContent('統計已超過 48 小時沒有更新，數字可能不是最新的。');
  });

  it('48 小時內更新過 → 不顯示過期提醒', async () => {
    fakeKev = freshKev([1, 0, 3, 2, 0, 0, 4]);
    renderPage();
    expect(await trend()).not.toHaveTextContent('數字可能不是最新的');
  });

  it('從未更新（佔位檔）或載入失敗 → 不顯示趨勢圖，新聞照常顯示', async () => {
    fakeKev = { updatedAt: null, daily: [] };
    const { unmount } = renderPage();
    await screen.findAllByRole('article');
    expect(screen.queryByRole('region', { name: '已被利用漏洞趨勢' })).not.toBeInTheDocument();
    unmount();

    fakeKev = 'fails';
    renderPage();
    await screen.findAllByRole('article');
    expect(screen.queryByRole('region', { name: '已被利用漏洞趨勢' })).not.toBeInTheDocument();
  });

  it('新聞上方不再有一行橫幅', async () => {
    fakeKev = freshKev([1, 0, 3, 2, 0, 0, 4]);
    renderPage();
    await trend();
    expect(screen.queryByRole('region', { name: '已遭駭客利用的漏洞' })).not.toBeInTheDocument();
  });
});

describe('最新情資頁：AI 白話新聞摘要', () => {
  it('每篇摘要卡有白話標題、摘要、「AI 摘要」標示，以及在新分頁開啟的原文連結', async () => {
    renderPage();
    const card = (await screen.findByRole('heading', { name: 'ASP.NET 舊套件漏洞遭駭客利用' })).closest('article')!;

    expect(within(card).getByText(/一個已停止維護的 ASP\.NET 套件/)).toBeInTheDocument();
    expect(within(card).getByText('AI 摘要')).toBeInTheDocument();
    const link = within(card).getByRole('link', { name: /閱讀原文/ });
    expect(link).toHaveAttribute('href', 'https://thehackernews.com/2026/11/hackers-exploit-critical-aspnet-anti.html');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('每張卡片底部標示來源與發布日（台灣時間的今天／昨天）', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-23T12:00:00.000Z')); // 台灣 11/23 20:00
    try {
      renderPage();
      const today = (await screen.findByRole('heading', { name: 'ASP.NET 舊套件漏洞遭駭客利用' })).closest('article')!;
      const yesterday = screen.getByRole('heading', { name: '新型惡意程式鎖定銀行' }).closest('article')!;

      expect(within(today).getByText('The Hacker News ·', { exact: false })).toHaveTextContent('The Hacker News · 今天');
      expect(within(yesterday).getByText('The Hacker News ·', { exact: false })).toHaveTextContent('The Hacker News · 昨天');
    } finally {
      vi.useRealTimers();
    }
  });

  it('有分類的摘要卡顯示分類標籤；舊資料沒有分類就不顯示', async () => {
    fakeNews = {
      ...twoArticles,
      items: [{ ...twoArticles.items[0], category: '漏洞' }, twoArticles.items[1]],
    };
    renderPage();
    const withCategory = (await screen.findByRole('heading', { name: 'ASP.NET 舊套件漏洞遭駭客利用' })).closest('article')!;
    const withoutCategory = screen.getByRole('heading', { name: '新型惡意程式鎖定銀行' }).closest('article')!;

    expect(within(withCategory).getByText('漏洞')).toBeInTheDocument();
    expect(within(withoutCategory).queryByText(/^(漏洞|惡意程式|詐騙|資料外洩|駭客攻擊)$/)).not.toBeInTheDocument();
  });

  it('區塊標題顯示篇數，卡片下方提醒 AI 摘要可能有誤', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: '2 篇焦點新聞' })).toBeInTheDocument();
    expect(screen.getByText('AI 摘要可能有誤，請以原文為準。')).toBeInTheDocument();
  });

  it('說明寫「每日更新」，不寫確切時間（GitHub 排程常會延遲）', async () => {
    renderPage();
    expect(await screen.findByText('用白話整理最近的資安新聞，每日更新。')).toBeInTheDocument();
  });

  it('以台灣時間顯示「情資更新於：YYYY-MM-DD HH:MM」', async () => {
    renderPage();
    expect(await screen.findByText('情資更新於：2026-11-23 08:00')).toBeInTheDocument();
  });

  it('摘要區塊附 JSON-LD：每篇是一則 NewsArticle', async () => {
    const { container } = renderPage();
    await screen.findAllByRole('article');
    const script = container.querySelector('script[type="application/ld+json"]')!;
    const data = JSON.parse(script.textContent!);

    expect(data['@context']).toBe('https://schema.org');
    expect(data['@graph']).toEqual([
      expect.objectContaining({
        '@type': 'NewsArticle',
        headline: 'ASP.NET 舊套件漏洞遭駭客利用',
        description: '一個已停止維護的 ASP.NET 套件有嚴重漏洞，駭客已經在利用。還在用的公司應該盡快換掉。',
        datePublished: '2026-11-23T09:11:56.000Z',
        inLanguage: 'zh-TW',
        isBasedOn: 'https://thehackernews.com/2026/11/hackers-exploit-critical-aspnet-anti.html',
      }),
      expect.objectContaining({ '@type': 'NewsArticle', headline: '新型惡意程式鎖定銀行' }),
    ]);
  });

  it('摘要裡出現 </script> 也不會跳出 JSON-LD 的 script 標籤', async () => {
    fakeNews = {
      updatedAt: '2026-11-23T00:00:00.000Z',
      items: [{ ...twoArticles.items[0], summary: '注意</script><img src=x onerror=alert(1)>' }],
    };
    const { container } = renderPage();
    await screen.findAllByRole('article');
    const script = container.querySelector('script[type="application/ld+json"]')!;

    expect(script.innerHTML).not.toContain('</script>');
    expect(JSON.parse(script.textContent!)['@graph'][0].description).toBe('注意</script><img src=x onerror=alert(1)>');
    expect(container.querySelector('img')).toBeNull();
  });

  it('載入中 → 顯示骨架屏，並標示正在載入', () => {
    fakeNews = 'pending';
    renderPage();
    expect(screen.getByRole('region', { name: '資安新聞摘要' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('載入完成 → 不再標示正在載入', async () => {
    renderPage();
    await screen.findAllByRole('article');
    expect(screen.getByRole('region', { name: '資安新聞摘要' })).toHaveAttribute('aria-busy', 'false');
  });

  it('超過 48 小時沒更新 → 提醒內容可能不是最新的', async () => {
    fakeNews = { ...twoArticles, updatedAt: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString() };
    renderPage();
    expect(await screen.findByText('情資已超過 48 小時沒有更新，內容可能不是最新的。')).toBeInTheDocument();
  });

  it('48 小時內更新過 → 不顯示提醒', async () => {
    fakeNews = { ...twoArticles, updatedAt: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString() };
    renderPage();
    await screen.findAllByRole('article');
    expect(screen.queryByText(/已超過 48 小時沒有更新/)).not.toBeInTheDocument();
  });

  it('載入失敗 → 說明原因與下一步', async () => {
    fakeNews = 'fails';
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('無法載入最新情資，請重新整理頁面再試一次。');
  });

  it('還沒有任何新聞 → 說明什麼時候會有', async () => {
    fakeNews = { updatedAt: null, items: [] };
    renderPage();
    expect(await screen.findByText('目前還沒有整理好的新聞。網站每日會自動更新，請稍後再回來看看。')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
});
