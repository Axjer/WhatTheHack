import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import AboutPage from './AboutPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <AboutPage />
    </MemoryRouter>,
  );
}

const section = (name: string) => screen.getByRole('region', { name });

describe('來源與說明頁', () => {
  it('列出四個資料來源，各自在新分頁開啟', () => {
    renderPage();
    const sources = section('資料來源');
    for (const name of [/^URLhaus/, /^OpenPhish/, /^The Hacker News/, /^CISA 已被利用漏洞清單/]) {
      const link = within(sources).getByRole('link', { name });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    }
  });

  it('依序說明判定順序，每一步符合就停在對應的判定結果', () => {
    renderPage();
    const ladder = within(section('網址分析怎麼判定')).getByRole('list', { name: '判定順序' });
    const steps = [...ladder.querySelectorAll<HTMLElement>(':scope > li')];

    expect(steps.map((step) => within(step).getByRole('heading', { level: 3 }).textContent)).toEqual([
      '第 1 步：網址在惡意網址清單中嗎？',
      '第 2 步：網址有任何一項警訊嗎？',
      '第 3 步：以上都沒有',
    ]);
    expect(steps[0]).toHaveTextContent('已知惡意');
    expect(steps[1]).toHaveTextContent('可疑');
    expect(steps[2]).toHaveTextContent('查無紀錄');
  });

  it('燈號只有文字標籤，不放 emoji', () => {
    renderPage();
    const region = section('網址分析怎麼判定');
    const lights = [...region.querySelectorAll<HTMLElement>('p.text-h2')];
    expect(lights.map((light) => light.textContent!.replace(/^(符合就)?判定為/, ''))).toEqual([
      '已知惡意',
      '可疑',
      '查無紀錄',
    ]);
  });

  it('說明三項警訊，範例網址以 defang 格式顯示且不可點擊', () => {
    renderPage();
    const region = section('網址分析怎麼判定');
    for (const sign of ['直接使用 IP 位址', '短網址服務', '網址中含「@」']) {
      expect(within(region).getByText(sign)).toBeInTheDocument();
    }
    expect(within(region).getByText('hxxps://bank[.]com@evil[.]com')).toBeInTheDocument();
    expect(within(region).queryByRole('link', { name: /evil/ })).not.toBeInTheDocument();
  });

  it('查無紀錄那一步直接說明為什麼不代表安全', () => {
    renderPage();
    const ladder = within(section('網址分析怎麼判定')).getByRole('list', { name: '判定順序' });
    const lastStep = [...ladder.querySelectorAll<HTMLElement>(':scope > li')].at(-1)!;
    expect(lastStep).toHaveTextContent('這不代表網址安全');
    expect(lastStep).toHaveTextContent('還沒被收錄');
  });

  it('不另設「為什麼沒有綠燈」與「AI 摘要怎麼產生」兩段', () => {
    renderPage();
    expect(screen.queryByRole('region', { name: '為什麼沒有綠燈' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'AI 摘要怎麼產生' })).not.toBeInTheDocument();
  });

  it('隱私聲明：輸入不離開瀏覽器', () => {
    renderPage();
    expect(section('隱私')).toHaveTextContent('你輸入的網址不會離開你的瀏覽器。');
  });

  it('免責聲明：判定結果僅供參考', () => {
    renderPage();
    const region = section('免責聲明');
    expect(region).toHaveTextContent('判定結果僅供參考');
    expect(region).toHaveTextContent('「查無紀錄」不代表網址安全');
  });

  it('不使用 GLOSSARY.md 列為避免的用詞', () => {
    const { container } = renderPage();
    expect(container).not.toHaveTextContent(/白名單|黑名單|特徵碼|風險等級|風險因子|掃描結果/);
  });

  it('目錄連到本頁每一段', () => {
    renderPage();
    const toc = screen.getByRole('navigation', { name: '本頁目錄', hidden: true });
    for (const link of within(toc).getAllByRole('link', { hidden: true })) {
      const id = link.getAttribute('href')!.slice(1);
      expect(document.getElementById(id)?.tagName).toBe('SECTION');
    }
  });
});
