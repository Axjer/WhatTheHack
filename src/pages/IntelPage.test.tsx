import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    const region = screen.getByRole('region', { name: '資安新聞摘要' });
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('載入完成 → 不再標示正在載入', async () => {
    renderPage();
    await screen.findAllByRole('article');
    expect(screen.getByRole('region', { name: '資安新聞摘要' })).toHaveAttribute('aria-busy', 'false');
  });

  it('載入失敗 → 說明原因與下一步', async () => {
    fakeNews = 'fails';
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('無法載入最新情資，請重新整理頁面再試一次。');
  });

  it('還沒有任何新聞 → 說明什麼時候會有', async () => {
    fakeNews = { updatedAt: null, items: [] };
    renderPage();
    expect(await screen.findByText(/還沒有整理好的新聞/)).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
});
