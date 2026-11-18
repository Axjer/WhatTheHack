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
  { label: '首頁', heading: '駭你好，先別點！' },
];

describe('導覽列', () => {
  it('桌面導覽列列出四個頁面', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: '主要導覽' });
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(labels).toEqual(['首頁', '網址分析', '最新情資', '來源與說明']);
  });

  it('點擊導覽連結可切換到每個頁面', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: '主要導覽' });

    for (const { label, heading } of pageHeadings) {
      await user.click(within(nav).getByRole('link', { name: label }));
      expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
    }
  });

  it('漢堡選單預設收合，點擊後展開', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const toggle = screen.getByRole('button', { name: '開啟選單' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: '手機選單' })).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('關閉選單');
    const menu = screen.getByRole('navigation', { name: '手機選單' });
    expect(within(menu).getAllByRole('link')).toHaveLength(4);
  });

  it('從漢堡選單切換頁面後選單自動收合', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('button', { name: '開啟選單' }));
    const menu = screen.getByRole('navigation', { name: '手機選單' });

    await user.click(within(menu).getByRole('link', { name: '最新情資' }));

    expect(screen.getByRole('heading', { level: 1, name: '最新情資' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '手機選單' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '開啟選單' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('未知路徑顯示找不到頁面', () => {
    renderAt('/no-such-page');
    expect(screen.getByRole('heading', { level: 1, name: '找不到這個頁面' })).toBeInTheDocument();
  });

  it('按 Esc 收合漢堡選單', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('button', { name: '開啟選單' }));

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('navigation', { name: '手機選單' })).not.toBeInTheDocument();
  });
});
