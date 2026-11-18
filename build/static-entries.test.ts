// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { staticEntryFiles } from './static-entries';

describe('staticEntryFiles', () => {
  it('首頁之外的每個頁面各有一個 index.html，另加 404.html 處理未知路徑', () => {
    expect(staticEntryFiles(['/', '/analyze', '/intel', '/about'])).toEqual([
      '404.html',
      'analyze/index.html',
      'intel/index.html',
      'about/index.html',
    ]);
  });
});
