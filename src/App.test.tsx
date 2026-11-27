import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import App from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const pageHeadings = [
  { label: '網址分析', heading: '網址分析' },
  { label: '最新情資', heading: '最新情資' },
  { label: '來源與說明', heading: '來源與說明' },
];

describe('導覽列', () => {
  it('依序列出三個內頁（首頁由 logo 進入）', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: '主要導覽' });
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(labels).toEqual(['網址分析', '最新情資', '來源與說明']);
  });

  it('點擊 logo 回到首頁', async () => {
    const user = userEvent.setup();
    renderAt('/intel');

    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: '駭你好' }));

    expect(screen.getByRole('heading', { level: 1, name: '駭你好' })).toBeInTheDocument();
  });

  it('點擊連結會切換到對應頁面', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: '主要導覽' });

    for (const { label, heading } of pageHeadings) {
      await user.click(within(nav).getByRole('link', { name: label }));
      expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    }
  });

  it('只把目前所在頁面標示為 aria-current', () => {
    renderAt('/intel');
    const nav = screen.getByRole('navigation', { name: '主要導覽' });
    const current = within(nav)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
      .map((link) => link.textContent);
    expect(current).toEqual(['最新情資']);
  });
});

describe('頁尾', () => {
  it.each(['/', '/intel', '/no-such-page'])('%s 最下方有頁尾，含 logo 連結、GitHub 連結與免責聲明', (path) => {
    renderAt(path);
    const footer = screen.getByRole('contentinfo');

    expect(within(footer).getByRole('link', { name: '駭你好' })).toHaveAttribute('href', '/');
    expect(within(footer).getByRole('link', { name: 'GitHub 專案原始碼' })).toHaveAttribute(
      'href',
      'https://github.com/Axjer/WhatTheHack',
    );
    expect(within(footer).getByText(/僅供參考/)).toBeInTheDocument();
    expect(within(footer).getByText(/「查無紀錄」不代表網址安全/)).toBeInTheDocument();
    expect(within(footer).queryByText(/免責聲明/)).not.toBeInTheDocument();
    expect(within(footer).queryByText(/如有疑慮/)).not.toBeInTheDocument();
  });

  it('點擊頁尾的 logo 回到首頁', async () => {
    const user = userEvent.setup();
    renderAt('/intel');

    await user.click(within(screen.getByRole('contentinfo')).getByRole('link', { name: '駭你好' }));

    expect(screen.getByRole('heading', { level: 1, name: '駭你好' })).toBeInTheDocument();
  });
});

describe('未知路徑', () => {
  it('顯示找不到頁面，並可回到首頁', async () => {
    const user = userEvent.setup();
    renderAt('/no-such-page');
    expect(screen.getByRole('heading', { level: 1, name: '找不到這個頁面' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '回到首頁' }));

    expect(screen.getByRole('heading', { level: 1, name: '駭你好' })).toBeInTheDocument();
  });
});

describe('漢堡選單', () => {
  it('預設收合，點擊後展開三個內頁連結', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const toggle = screen.getByRole('button', { name: '開啟選單' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: '手機選單' })).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('關閉選單');
    const menu = screen.getByRole('navigation', { name: '手機選單' });
    expect(within(menu).getAllByRole('link')).toHaveLength(3);
  });

  it('從選單切換頁面後自動收合', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('button', { name: '開啟選單' }));
    const menu = screen.getByRole('navigation', { name: '手機選單' });

    await user.click(within(menu).getByRole('link', { name: '最新情資' }));

    expect(screen.getByRole('heading', { level: 1, name: '最新情資' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '手機選單' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '開啟選單' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('按 Esc 收合選單，焦點回到選單按鈕', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('button', { name: '開啟選單' }));
    await user.tab();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('navigation', { name: '手機選單' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '開啟選單' })).toHaveFocus();
  });
});
