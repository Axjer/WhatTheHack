import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadJson } from './loadJson';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadJson', () => {
  it('每次都向伺服器確認資料檔有沒有更新（no-cache），部署後不會拿到快取裡的舊檔', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(loadJson('kev.json')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}data/kev.json`, { cache: 'no-cache' });
  });

  it('伺服器回錯誤 → 丟出錯誤，讓頁面顯示載入失敗', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    await expect(loadJson('kev.json')).rejects.toThrow('HTTP 404');
  });
});
