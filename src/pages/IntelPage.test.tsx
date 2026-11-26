import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KevFile, KevProduct } from '../data/kev';
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

/** 近 30 天正被攻擊的產品：一般人常用的在前，各自由新到舊 */
const products: KevProduct[] = [
  { name: 'Microsoft Windows', count: 3, latestDate: '2026-11-20', ransomware: true, everyday: true },
  { name: 'Google Chrome', count: 1, latestDate: '2026-11-18', ransomware: false, everyday: true },
  { name: 'Mitel MiCollab', count: 5, latestDate: '2026-11-25', ransomware: false, everyday: false },
  { name: 'Fortinet FortiOS', count: 2, latestDate: '2026-11-05', ransomware: false, everyday: false },
];

/** 剛更新過的 KEV 統計 */
function freshKev(list: KevProduct[] = products): KevFile {
  return { updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), products: list };
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
  fakeKev = freshKev();
});

describe('最新情資頁：最近正被攻擊的軟體（CISA KEV）', () => {
  const section = () => screen.findByRole('region', { name: '最近正被攻擊的軟體' });
  const items = async () => within(await section()).getAllByRole('listitem');

  it('說明範圍，並在清單上方給一次具體建議', async () => {
    renderPage();
    const region = await section();
    expect(region).toHaveTextContent('近 30 天，美國網路安全機構（CISA）確認已有攻擊者在利用漏洞的軟體。');
    expect(region).toHaveTextContent(
      '如果你有使用以下任何軟體或設備，請盡快更新到最新版；公司或學校的設備請轉告 IT 人員。',
    );
  });

  it('依檔案順序（最近收錄的在前）逐項列出產品名、漏洞數與收錄日期', async () => {
    renderPage();
    const list = await items();
    expect(list.map((item) => within(item).getByRole('heading').textContent)).toEqual([
      'Microsoft Windows',
      'Google Chrome',
      'Mitel MiCollab',
      'Fortinet FortiOS',
    ]);
    expect(list[0]).toHaveTextContent('3 個漏洞正被利用');
    expect(list[0]).toHaveTextContent('11/20 收錄');
    expect(within(list[0]).getByText('11/20 收錄')).toHaveAttribute('datetime', '2026-11-20');
    expect(list[1]).toHaveTextContent('1 個漏洞正被利用');
  });

  it('一般人常用的軟體直接顯示；其他產品預設收起來，摘要列寫出數量，點了才展開', async () => {
    renderPage();
    const region = await section();
    const toggle = within(region).getByText('另外 2 項，多為公司或機構使用的產品');
    const others = toggle.closest('details')!;
    expect(others).not.toHaveAttribute('open');
    expect(within(others).getByRole('heading', { name: 'Mitel MiCollab' })).toBeInTheDocument();
    expect(within(others).queryByRole('heading', { name: 'Microsoft Windows' })).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(others).toHaveAttribute('open');
  });

  it('只有常用軟體 → 不出現收起來的區塊', async () => {
    fakeKev = freshKev(products.filter((product) => product.everyday));
    renderPage();
    const region = await section();
    expect(region.querySelector('details')).toBeNull();
    expect(within(region).getAllByRole('listitem')).toHaveLength(2);
  });

  it('沒有常用軟體 → 說明沒有常見的個人軟體，但提醒下方仍可能有用到的設備；其他產品照樣收起來', async () => {
    fakeKev = freshKev(products.filter((product) => !product.everyday));
    renderPage();
    const region = await section();
    expect(region).toHaveTextContent('近 30 天沒有常見的個人軟體被收錄，但下方仍可能有你用到的設備。');
    expect(within(region).getByText('另外 2 項，多為公司或機構使用的產品').closest('details')).not.toHaveAttribute('open');
  });

  it('有勒索軟體紀錄的產品才標示', async () => {
    renderPage();
    const list = await items();
    expect(list[0]).toHaveTextContent('已被用於勒索軟體攻擊');
    expect(list[1]).not.toHaveTextContent('勒索軟體');
  });

  it('不放長條圖與結論句；不顯示 CVE 編號與 CVSS 分數', async () => {
    renderPage();
    const region = await section();
    expect(within(region).queryByRole('img')).not.toBeInTheDocument();
    expect(region).not.toHaveTextContent(/結論|CVE-|CVSS/);
  });

  it('說明資料來源與更新頻率', async () => {
    renderPage();
    expect(await section()).toHaveTextContent(
      '資料每日統計一次，清單來自美國 CISA 已被利用漏洞清單（Known Exploited Vulnerabilities）。',
    );
  });

  it('近 30 天沒有新增 → 說明沒有新增，不說「安全」，仍註明來源', async () => {
    fakeKev = freshKev([]);
    renderPage();
    const region = await section();
    expect(region).toHaveTextContent('近 30 天沒有新增正被攻擊的軟體。');
    // 副標的「網路安全機構」不算
    expect(region).not.toHaveTextContent(/安全(?!機構)/);
    expect(region).not.toHaveTextContent('請盡快更新');
    expect(within(region).queryByRole('listitem')).not.toBeInTheDocument();
    expect(region).toHaveTextContent('資料每日統計一次');
  });

  it('在新聞之後', async () => {
    renderPage();
    const region = await section();
    const newsHeading = await screen.findByRole('heading', { name: '2 篇焦點新聞' });
    expect(newsHeading.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('超過 48 小時沒更新 → 照樣顯示，並提醒清單可能不是最新的', async () => {
    fakeKev = { ...freshKev(), updatedAt: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString() };
    renderPage();
    expect(await section()).toHaveTextContent('清單已超過 48 小時沒有更新，可能不是最新的。');
  });

  it('48 小時內更新過 → 不顯示過期提醒', async () => {
    renderPage();
    expect(await section()).not.toHaveTextContent('48 小時');
  });

  it('從未更新（佔位檔）或載入失敗 → 不顯示這一區，新聞照常顯示', async () => {
    fakeKev = { updatedAt: null, products: [] };
    const { unmount } = renderPage();
    await screen.findAllByRole('article');
    expect(screen.queryByRole('region', { name: '最近正被攻擊的軟體' })).not.toBeInTheDocument();
    unmount();

    fakeKev = 'fails';
    renderPage();
    await screen.findAllByRole('article');
    expect(screen.queryByRole('region', { name: '最近正被攻擊的軟體' })).not.toBeInTheDocument();
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
