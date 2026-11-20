import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AnalyzePage from './AnalyzePage';

function setup() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <AnalyzePage />
    </MemoryRouter>,
  );
  async function analyze(text: string) {
    const input = screen.getByRole('textbox', { name: '要查詢的網址' });
    await user.clear(input);
    if (text) {
      await user.click(input);
      await user.paste(text);
    }
    await user.click(screen.getByRole('button', { name: '查詢' }));
  }
  return { user, analyze };
}

const verdictHeading = () => screen.queryByRole('heading', { level: 2, name: /^判定結果：/ });
const verdictCard = () => screen.getByRole('region', { name: /^判定結果：/ });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('網址分析頁', () => {
  it('輸入框是頁面上第一個表單元件', () => {
    setup();
    expect(screen.getAllByRole('textbox')[0]).toHaveAccessibleName('要查詢的網址');
  });

  it.each(['', '您的包裹 https://evil-login.example/pay 待領取', 'hxxps://evil-login[.]example/pay', 'someone@example.com'])(
    '「%s」不是網址 → 顯示「請輸入網址」且不顯示燈號',
    async (text) => {
      const { analyze } = setup();
      await analyze(text);

      expect(screen.getByText('請輸入網址')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: '要查詢的網址' })).toHaveAttribute('aria-invalid', 'true');
      expect(verdictHeading()).not.toBeInTheDocument();
    },
  );

  it('已知惡意：燈號（圖示＋文字）、白話判斷、命中來源數與建議行動', async () => {
    const { analyze } = setup();
    await analyze('https://evil-login.example/pay');

    expect(verdictHeading()).toHaveTextContent('⛔已知惡意');
    expect(verdictHeading()).toHaveFocus();
    const card = verdictCard();
    expect(within(card).getByText('這個網址曾被通報用來騙取帳號密碼、散布惡意程式，請不要點擊。')).toBeInTheDocument();
    expect(within(card).getByText('2 個來源命中')).toBeInTheDocument();

    const actions = screen.getByRole('region', { name: '建議行動' });
    expect(within(actions).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '不要點擊或轉傳',
      '回報 IT 或資安窗口',
      '若已點擊，立即更改密碼',
    ]);
  });

  it('查無紀錄：燈號（圖示＋文字）與固定文案', async () => {
    const { analyze } = setup();
    await analyze('example.org');

    expect(verdictHeading()).toHaveTextContent('❔查無紀錄');
    expect(
      within(verdictCard()).getByText(
        '目前的資料庫中沒有這個網址的紀錄。這不代表它安全；如果訊息來源可疑，請先向寄件人或 IT 人員確認。',
      ),
    ).toBeInTheDocument();
  });

  it('分析報告（詳細）預設折疊，展開後有網址拆解、標籤與時間、來源比對', async () => {
    const { user, analyze } = setup();
    await analyze('https://evil-login.example/pay');

    const details = screen.getByText('分析報告（詳細）').closest('details')!;
    expect(details).not.toHaveAttribute('open');
    await user.click(screen.getByText('分析報告（詳細）'));
    expect(details).toHaveAttribute('open');

    const parts = within(details).getByRole('region', { name: '網址拆解' });
    expect(within(parts).getByText('evil-login[.]example')).toBeInTheDocument();
    expect(within(parts).getByText('網域已被通報')).toBeInTheDocument();

    const tags = within(details).getByRole('region', { name: '標籤與時間' });
    expect(within(tags).getByText('釣魚')).toBeInTheDocument();
    expect(within(tags).getByText('惡意程式下載')).toBeInTheDocument();

    const sources = within(details).getByRole('region', { name: '來源比對' });
    const rows = within(sources).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual(['命中', '命中']);
  });

  it('可疑：燈號（圖示＋文字）並以白話說明符合的警訊', async () => {
    const { analyze } = setup();
    await analyze('https://bit.ly/3abcDEF');

    expect(verdictHeading()).toHaveTextContent('⚠️可疑');
    const card = verdictCard();
    expect(within(card).getByText(/不在惡意網址清單中，但有可疑的地方/)).toBeInTheDocument();
    expect(within(card).getByText('這是短網址，看不出點開後真正會連到哪裡。')).toBeInTheDocument();
  });

  it('已知惡意且符合警訊：仍是已知惡意，詳細報告說明符合的警訊', async () => {
    const { user, analyze } = setup();
    // 暫時清單中的網址加上「someone@」：仍連到同一個網址，但符合「網址中含 @」
    await analyze('https://someone@evil-login.example/pay');

    expect(verdictHeading()).toHaveTextContent('已知惡意');
    await user.click(screen.getByText('分析報告（詳細）'));
    const parts = screen.getByRole('region', { name: '網址拆解' });
    expect(within(parts).getByText(/瀏覽器會忽略 @ 前面的文字/)).toBeInTheDocument();
  });

  it('詳細報告不逐項列出五項警訊的檢查結果', async () => {
    const { user, analyze } = setup();
    await analyze('example.org');
    await user.click(screen.getByText('分析報告（詳細）'));

    expect(screen.queryByRole('region', { name: '警訊檢查' })).not.toBeInTheDocument();
    expect(screen.queryByText('未符合')).not.toBeInTheDocument();
  });

  it('網址只以 defang 格式顯示，報告中沒有任何連結', async () => {
    const { analyze } = setup();
    await analyze('https://evil-login.example/pay');

    expect(within(verdictCard()).getByText(/hxxps:\/\/evil-login\[\.\]example\/pay/)).toBeInTheDocument();
    const page = screen.getByRole('heading', { level: 1, name: '網址分析' }).closest('div')!;
    expect(page.textContent).not.toContain('evil-login.example');
    expect(within(page).queryAllByRole('link')).toHaveLength(0);
  });

  it('共用平台上網域被收錄但完整網址不符 → 查無紀錄', async () => {
    const { analyze } = setup();
    await analyze('https://drive.google.com/file/d/my-report/view');
    expect(verdictHeading()).toHaveTextContent('查無紀錄');
  });

  it('分析時不送出任何網路請求', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { analyze } = setup();
    await analyze('https://evil-login.example/pay');
    await analyze('example.org');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
