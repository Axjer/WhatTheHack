import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import type { KevFile } from '../data/kev';
import type { StatsFile } from '../data/stats';

/** 假的首頁統計檔與 KEV 統計檔；fails 時模擬讀不到 */
let fakeStats: StatsFile | 'fails';
let fakeKev: KevFile | 'fails';

vi.mock('../data/loadStats', () => ({
  loadStats: () => (fakeStats === 'fails' ? Promise.reject(new Error('HTTP 404')) : Promise.resolve(fakeStats)),
}));

vi.mock('../data/loadKev', () => ({
  loadKev: () => (fakeKev === 'fails' ? Promise.reject(new Error('HTTP 404')) : Promise.resolve(fakeKev)),
}));

/** 首頁主視覺輪播的名稱（即頁面 H1） */
const heroTitle = '駭你好';

/** 首頁底部兩個區塊的標題（區塊名稱） */
const statsTitle = '每天持續更新的資安防護網';
const actionsTitle = '兩大核心功能';

const kevProduct = { count: 1, latestDate: '2026-11-20', ransomware: false, everyday: true };

beforeEach(() => {
  fakeStats = { maliciousUrlCount: 90123 };
  fakeKev = {
    updatedAt: '2026-11-26T00:00:00.000Z',
    products: Array.from({ length: 38 }, (_, index) => ({ name: `Vendor Product ${index}`, ...kevProduct })),
  };
});

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
}

/** 主視覺輪播目前顯示的那一張（沒輪到的那張對輔助科技隱藏） */
function currentSlide() {
  return within(screen.getByRole('region', { name: heroTitle })).getByRole('group');
}

function slideTitle(slide: HTMLElement) {
  return within(slide).getByRole('heading', { level: 2 }).textContent;
}

describe('首頁主視覺輪播', () => {
  it('頁面標題（H1）是「駭你好」；兩張輪播依序是網址分析、最新情資', () => {
    renderHome();
    const hero = screen.getByRole('region', { name: heroTitle });

    expect(within(hero).getByRole('heading', { level: 1 }).textContent).toBe(heroTitle);
    const titles = within(hero)
      .getAllByRole('heading', { level: 2, hidden: true })
      .map((heading) => heading.textContent);
    expect(titles).toEqual(['收到可疑連結？', '威脅持續變化！']);
  });

  it('一開始顯示第一張：主標、副標與「開始分析」按鈕；第二張對輔助科技隱藏且不可操作', () => {
    renderHome();
    const hero = screen.getByRole('region', { name: heroTitle });
    const slide = currentSlide();

    expect(slideTitle(slide)).toBe('收到可疑連結？');
    expect(within(slide).getByText('透過網址分析，幫助你辨識潛在風險。')).toBeInTheDocument();
    expect(within(slide).getByRole('link', { name: '開始分析' })).toBeInTheDocument();
    expect(within(hero).queryByRole('link', { name: '了解情資' })).not.toBeInTheDocument();
    const hidden = within(hero).getAllByRole('group', { hidden: true }).find((group) => group !== slide);
    expect(hidden).toHaveAttribute('inert');
  });

  it('「開始分析」前往網址分析頁', async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(within(currentSlide()).getByRole('link', { name: '開始分析' }));

    expect(screen.getByRole('heading', { level: 1, name: '網址分析' })).toBeInTheDocument();
  });

  it('按「下一張」換到第二張，「了解情資」前往最新情資頁', async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByRole('button', { name: '下一張' }));
    const slide = currentSlide();
    expect(slideTitle(slide)).toBe('威脅持續變化！');
    expect(within(slide).getByText('用簡單易懂的方式掌握威脅動態。')).toBeInTheDocument();

    await user.click(within(slide).getByRole('link', { name: '了解情資' }));
    expect(screen.getByRole('heading', { level: 1, name: '最新情資' })).toBeInTheDocument();
  });

  it('上一張／下一張到頭會繞回另一端', async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByRole('button', { name: '上一張' }));
    expect(slideTitle(currentSlide())).toBe('威脅持續變化！');
    await user.click(screen.getByRole('button', { name: '下一張' }));
    expect(slideTitle(currentSlide())).toBe('收到可疑連結？');
  });

  it('點指示線切換到對應的那一張，並標示目前是哪一張', async () => {
    const user = userEvent.setup();
    renderHome();
    const first = screen.getByRole('button', { name: '第 1 張：網址分析' });
    const second = screen.getByRole('button', { name: '第 2 張：最新情資' });
    expect(first).toHaveAttribute('aria-current', 'true');
    expect(second).not.toHaveAttribute('aria-current');

    await user.click(second);

    expect(slideTitle(currentSlide())).toBe('威脅持續變化！');
    expect(second).toHaveAttribute('aria-current', 'true');
    expect(first).not.toHaveAttribute('aria-current');
  });

  describe('自動輪播（插畫動畫播完後 8 秒）', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('第一張動畫（2.8 秒）播完後滿 8 秒換到第二張，再依第二張的動畫長度（1.9 秒）＋8 秒換回第一張', () => {
      renderHome();

      act(() => vi.advanceTimersByTime(10_799));
      expect(slideTitle(currentSlide())).toBe('收到可疑連結？');
      act(() => vi.advanceTimersByTime(1));
      expect(slideTitle(currentSlide())).toBe('威脅持續變化！');

      act(() => vi.advanceTimersByTime(9_900));
      expect(slideTitle(currentSlide())).toBe('收到可疑連結？');
    });

    it('手動換張後重新計時', () => {
      renderHome();

      act(() => vi.advanceTimersByTime(5_000));
      fireEvent.click(screen.getByRole('button', { name: '第 2 張：最新情資' }));
      act(() => vi.advanceTimersByTime(9_899));
      expect(slideTitle(currentSlide())).toBe('威脅持續變化！');
      act(() => vi.advanceTimersByTime(1));
      expect(slideTitle(currentSlide())).toBe('收到可疑連結？');
    });

    it('滑鼠停在主視覺上時不換張，移開後重新計時', () => {
      renderHome();
      const hero = screen.getByRole('region', { name: heroTitle });

      fireEvent.pointerEnter(hero, { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(60_000));
      expect(slideTitle(currentSlide())).toBe('收到可疑連結？');

      fireEvent.pointerLeave(hero, { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(10_800));
      expect(slideTitle(currentSlide())).toBe('威脅持續變化！');
    });

    it('手機點擊（觸控）不會讓輪播停住', () => {
      renderHome();
      const hero = screen.getByRole('region', { name: heroTitle });

      fireEvent.pointerEnter(hero, { pointerType: 'touch' });
      act(() => vi.advanceTimersByTime(10_800));
      expect(slideTitle(currentSlide())).toBe('威脅持續變化！');
    });

    it('使用者要求減少動態時不自動換張', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
      renderHome();

      act(() => vi.advanceTimersByTime(60_000));
      expect(slideTitle(currentSlide())).toBe('收到可疑連結？');
      vi.unstubAllGlobals();
    });

    it('沒有暫停按鈕', () => {
      renderHome();
      expect(screen.queryByRole('button', { name: /暫停|繼續/ })).not.toBeInTheDocument();
    });
  });

  it('手機上左右滑動切換', () => {
    renderHome();
    const hero = screen.getByRole('region', { name: heroTitle });

    fireEvent.touchStart(hero, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(hero, { changedTouches: [{ clientX: 100 }] });
    expect(slideTitle(currentSlide())).toBe('威脅持續變化！');

    fireEvent.touchStart(hero, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(hero, { changedTouches: [{ clientX: 300 }] });
    expect(slideTitle(currentSlide())).toBe('收到可疑連結？');
  });

  it('第一張的插畫示範判定結果：網址以 defang 格式顯示（不可點擊）、「可疑」燈號與白話說明', () => {
    renderHome();
    const demo = within(currentSlide()).getByRole('figure', { name: '範例：檢查網址後的判定結果' });

    expect(demo.textContent).toContain('hxxps://bank.com@evil[.]com');
    expect(within(demo).getByText('可疑', { selector: '[data-verdict]' })).toBeInTheDocument();
    expect(within(demo).getByText(/網址中有「@」.*實際連到的是/)).toBeInTheDocument();
    expect(within(demo).queryAllByRole('link')).toHaveLength(0);
  });
});

describe('痛點與解法', () => {
  it('依序列出三個痛點', () => {
    renderHome();
    const section = screen.getByRole('region', { name: '常見的擔心' });
    const painPoints = within(section)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(painPoints).toEqual(['怕誤點', '術語看不懂', '跟不上資安消息']);
  });

  it('每個痛點只有文字說明，卡片裡沒有連結或按鈕', () => {
    renderHome();
    const section = screen.getByRole('region', { name: '常見的擔心' });

    expect(within(section).queryAllByRole('link')).toHaveLength(0);
    expect(within(section).queryAllByRole('button')).toHaveLength(0);
  });
});

describe('數據卡', () => {
  it('有三張數據卡', () => {
    renderHome();
    const section = screen.getByRole('region', { name: statsTitle });
    expect(within(section).getAllByRole('listitem')).toHaveLength(3);
  });

  it('上方有看得到的主標與副標', () => {
    renderHome();
    const section = screen.getByRole('region', { name: statsTitle });
    expect(within(section).getByRole('heading', { level: 2, name: statsTitle })).not.toHaveClass('sr-only');
    expect(within(section).getByText('串接全球公開威脅資料庫，掌握最新漏洞動態')).toBeInTheDocument();
  });

  it('數字往下取整並帶單位：惡意網址筆數、近期受攻擊軟體數、更新頻率', async () => {
    renderHome();
    const section = screen.getByRole('region', { name: statsTitle });
    const cards = within(section).getAllByRole('listitem');

    expect(await within(cards[0]).findByText('90,000+')).toBeInTheDocument();
    expect(within(cards[0]).getByText('筆')).toBeInTheDocument();
    expect(within(cards[0]).getByText('已知惡意網址')).toBeInTheDocument();
    expect(await within(cards[1]).findByText('30+')).toBeInTheDocument();
    expect(within(cards[1]).getByText('項')).toBeInTheDocument();
    expect(within(cards[1]).getByText('近期受攻擊軟體')).toBeInTheDocument();
    expect(within(cards[2]).getByText('24')).toBeInTheDocument();
    expect(within(cards[2]).getByText('小時')).toBeInTheDocument();
    expect(within(cards[2]).getByText('自動更新一次')).toBeInTheDocument();
  });

  // 兩個檔案依序載入：等另一張卡出現數字，代表失敗的那個也已處理完
  it('讀不到統計檔時，惡意網址卡顯示「—」，不顯示 0', async () => {
    fakeStats = 'fails';
    renderHome();
    const cards = within(screen.getByRole('region', { name: statsTitle })).getAllByRole('listitem');

    expect(await within(cards[1]).findByText('30+')).toBeInTheDocument();
    expect(within(cards[0]).getByText('—')).toBeInTheDocument();
    expect(within(cards[0]).queryByText('0')).not.toBeInTheDocument();
    expect(within(cards[0]).queryByText('筆')).not.toBeInTheDocument();
  });

  it('讀不到 KEV 統計檔時，受攻擊軟體卡顯示「—」，不顯示 0', async () => {
    fakeKev = 'fails';
    renderHome();
    const cards = within(screen.getByRole('region', { name: statsTitle })).getAllByRole('listitem');

    expect(await within(cards[0]).findByText('90,000+')).toBeInTheDocument();
    expect(within(cards[1]).getByText('—')).toBeInTheDocument();
    expect(within(cards[1]).queryByText('0')).not.toBeInTheDocument();
    expect(within(cards[1]).queryByText('項')).not.toBeInTheDocument();
  });

  it('惡意網址筆數為 0 時顯示「—」', async () => {
    fakeStats = { maliciousUrlCount: 0 };
    renderHome();
    const cards = within(screen.getByRole('region', { name: statsTitle })).getAllByRole('listitem');

    expect(await within(cards[1]).findByText('30+')).toBeInTheDocument();
    expect(within(cards[0]).getByText('—')).toBeInTheDocument();
  });

  it('KEV 統計檔有幾項就顯示幾項，不論是否過期或從未更新', async () => {
    fakeKev = {
      updatedAt: null,
      products: Array.from({ length: 41 }, (_, index) => ({ name: `Vendor Product ${index}`, ...kevProduct })),
    };
    renderHome();
    const cards = within(screen.getByRole('region', { name: statsTitle })).getAllByRole('listitem');

    expect(await within(cards[1]).findByText('40+')).toBeInTheDocument();
  });

  it('KEV 近 30 天沒有產品時照實顯示 0 項', async () => {
    fakeKev = { updatedAt: '2026-11-26T00:00:00.000Z', products: [] };
    renderHome();
    const cards = within(screen.getByRole('region', { name: statsTitle })).getAllByRole('listitem');

    expect(await within(cards[1]).findByText('0')).toBeInTheDocument();
    expect(within(cards[1]).getByText('項')).toBeInTheDocument();
  });
});

describe('行動按鈕', () => {
  it('位於頁面最後一個區塊', () => {
    renderHome();
    const sections = within(screen.getByRole('main')).getAllByRole('region');
    expect(sections.at(-1)).toBe(screen.getByRole('region', { name: actionsTitle }));
  });

  it('上方有主標「兩大核心功能」與副標', () => {
    renderHome();
    const cta = screen.getByRole('region', { name: actionsTitle });
    expect(within(cta).getByText('現在就開始你的日常資安防護')).toBeInTheDocument();
  });

  it('分成「網址分析」與「最新情資」兩個區塊', () => {
    renderHome();
    const cta = screen.getByRole('region', { name: actionsTitle });
    const blocks = within(cta)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(blocks).toEqual(['網址分析', '最新情資']);
  });

  it('說明文字介紹按鈕前往的說明段落會講什麼', () => {
    renderHome();
    const cta = screen.getByRole('region', { name: actionsTitle });

    expect(within(cta).getByText('我們怎麼判定網址？')).toBeInTheDocument();
    expect(within(cta).getByText('威脅情資從哪裡來？')).toBeInTheDocument();
  });

  it('兩顆按鈕的文字都是「了解更多」，並各自附上只給螢幕閱讀器讀的目的地', () => {
    renderHome();
    const cta = screen.getByRole('region', { name: actionsTitle });
    const links = within(cta).getAllByRole('link');

    expect(links.map((link) => link.textContent)).toEqual(['了解更多網址分析怎麼判定', '了解更多最新情資怎麼整理']);
    expect(within(cta).getAllByText('了解更多', { exact: false, ignore: '.sr-only' })).toHaveLength(2);
  });

  it.each([
    { name: '了解更多網址分析怎麼判定', section: '網址分析怎麼判定' },
    { name: '了解更多最新情資怎麼整理', section: '最新情資怎麼整理' },
  ])('「$name」前往來源與說明頁的「$section」段落', async ({ name, section }) => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderHome();
    const cta = screen.getByRole('region', { name: actionsTitle });

    await user.click(within(cta).getByRole('link', { name }));

    expect(screen.getByRole('heading', { level: 1, name: '來源與說明' })).toBeInTheDocument();
    expect(scrollIntoView.mock.contexts).toEqual([screen.getByRole('region', { name: section })]);
    // jsdom 沒有 scrollIntoView：用完拿掉，不留給後面的測試
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });
});

describe('配色', () => {
  it('首頁只有主視覺示範是判定結果', () => {
    renderHome();
    const verdicts = screen.getByRole('main').querySelectorAll('[data-verdict]');
    const demo = screen.getByRole('figure', { name: '範例：檢查網址後的判定結果' });

    expect(verdicts).toHaveLength(1);
    expect(demo).toContainElement(verdicts[0] as HTMLElement);
  });

  it('燈號顏色（紅、黃、灰）只出現在判定結果裡', () => {
    renderHome();
    const verdictColorClass = /-(danger|warning|unknown)(-bg)?(\/\d+)?$/;
    const offenders = Array.from(screen.getByRole('main').querySelectorAll('*'))
      .filter((element) => !element.closest('[data-verdict]'))
      .flatMap((element) => Array.from(element.classList))
      .filter((className) => verdictColorClass.test(className));
    expect(offenders).toEqual([]);
  });
});
