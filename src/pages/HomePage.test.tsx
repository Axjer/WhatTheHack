import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import App from '../App';

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
}

describe('首頁主視覺', () => {
  it('只放兩行標題，「白話」被強調，沒有按鈕、連結、輸入框或圖片', () => {
    renderHome();
    const hero = screen.getByRole('region', { name: '駭你好，先別點！貼上網址，用白話告訴你能不能點' });

    const heading = within(hero).getByRole('heading', { level: 1 });
    expect(within(heading).getByText('白話').tagName).toBe('EM');
    for (const role of ['button', 'link', 'textbox', 'img']) {
      expect(within(hero).queryAllByRole(role)).toHaveLength(0);
    }
  });
});

describe('痛點與解法', () => {
  it('依序列出三個痛點', () => {
    renderHome();
    const section = screen.getByRole('region', { name: '常見的擔心' });
    const painPoints = within(section)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(painPoints).toEqual(['術語看不懂', '怕誤點', '怕隱私外洩']);
  });

  it.each(['看判定方式', '認識警訊', '隱私與限制'])('「%s」連到來源與說明頁', async (linkName) => {
    const user = userEvent.setup();
    renderHome();
    const section = screen.getByRole('region', { name: '常見的擔心' });

    await user.click(within(section).getByRole('link', { name: linkName }));

    expect(screen.getByRole('heading', { level: 1, name: '來源與說明' })).toBeInTheDocument();
  });
});

describe('數據卡', () => {
  it('有三張數據卡', () => {
    renderHome();
    const section = screen.getByRole('region', { name: '平台數據' });
    expect(within(section).getAllByRole('listitem')).toHaveLength(3);
  });
});

describe('行動按鈕', () => {
  it('位於頁面最後一個區塊', () => {
    renderHome();
    const sections = within(screen.getByRole('main')).getAllByRole('region');
    expect(sections.at(-1)).toBe(screen.getByRole('region', { name: '收到可疑連結？' }));
  });

  it('分成「網址分析」與「最新情資」兩個區塊', () => {
    renderHome();
    const cta = screen.getByRole('region', { name: '收到可疑連結？' });
    const blocks = within(cta)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(blocks).toEqual(['網址分析', '最新情資']);
  });

  it.each([
    { button: '檢查網址', heading: '網址分析' },
    { button: '看最新情資', heading: '最新情資' },
  ])('「$button」前往 $heading 頁', async ({ button, heading }) => {
    const user = userEvent.setup();
    renderHome();
    const cta = screen.getByRole('region', { name: '收到可疑連結？' });

    await user.click(within(cta).getByRole('link', { name: button }));

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });
});

describe('配色', () => {
  it('首頁不使用燈號顏色（紅、黃、灰只用於判定結果）', () => {
    renderHome();
    const verdictColorClass = /-(danger|warning|unknown)(-bg)?(\/\d+)?$/;
    const offenders = Array.from(screen.getByRole('main').querySelectorAll('*'))
      .flatMap((element) => Array.from(element.classList))
      .filter((className) => verdictColorClass.test(className));
    expect(offenders).toEqual([]);
  });
});
