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
  it('兩行標題，「白話」以粗體強調，沒有按鈕、連結、輸入框或圖片', () => {
    renderHome();
    const hero = screen.getByRole('region', { name: '駭你好，先別點！貼上網址，用白話告訴你能不能點' });

    const heading = within(hero).getByRole('heading', { level: 1 });
    expect(within(heading).getByText('白話').tagName).toBe('STRONG');
    for (const role of ['button', 'link', 'textbox', 'img']) {
      expect(within(hero).queryAllByRole(role)).toHaveLength(0);
    }
  });

  it('旁邊示範判定結果：網址以 defang 格式顯示（不可點擊），並給出「已知惡意」燈號', () => {
    renderHome();
    const hero = screen.getByRole('region', { name: '駭你好，先別點！貼上網址，用白話告訴你能不能點' });
    const demo = within(hero).getByRole('figure', { name: '範例：貼上網址後的判定結果' });

    expect(within(demo).getByText('hxxps://evil[.]com')).toBeInTheDocument();
    expect(within(demo).getByText('已知惡意', { selector: 'p' }).textContent).toBe('已知惡意');
    expect(within(demo).queryAllByRole('link')).toHaveLength(0);
  });

  it('燈號下方用白話說明這個判定結果', () => {
    renderHome();
    const demo = screen.getByRole('figure', { name: '範例：貼上網址後的判定結果' });

    expect(within(demo).getByText(/在惡意網址清單中.*不要點開/)).toBeInTheDocument();
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

  it('兩顆按鈕的文字都是「了解更多」，並各自附上只給螢幕閱讀器讀的目的地', () => {
    renderHome();
    const cta = screen.getByRole('region', { name: '收到可疑連結？' });
    const links = within(cta).getAllByRole('link');

    expect(links.map((link) => link.textContent)).toEqual(['了解更多網址分析', '了解更多最新情資']);
    expect(within(cta).getAllByText('了解更多', { exact: false, ignore: '.sr-only' })).toHaveLength(2);
  });

  it.each([
    { name: '了解更多網址分析', heading: '網址分析' },
    { name: '了解更多最新情資', heading: '最新情資' },
  ])('「$name」前往 $heading 頁', async ({ name, heading }) => {
    const user = userEvent.setup();
    renderHome();
    const cta = screen.getByRole('region', { name: '收到可疑連結？' });

    await user.click(within(cta).getByRole('link', { name }));

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });
});

describe('配色', () => {
  it('首頁只有主視覺示範是判定結果', () => {
    renderHome();
    const verdicts = screen.getByRole('main').querySelectorAll('[data-verdict]');
    const demo = screen.getByRole('figure', { name: '範例：貼上網址後的判定結果' });

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
