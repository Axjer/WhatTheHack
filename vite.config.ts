/// <reference types="vitest/config" />
import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { pages } from './src/routes.ts';

/**
 * GitHub Pages 只提供靜態檔案。把 index.html 複製到每個頁面路徑（直接開啟子頁面時回傳 200），
 * 並複製成 404.html，讓未知路徑也由 React 處理。
 */
function githubPagesEntries(): Plugin {
  let outDir = 'dist';
  return {
    name: 'github-pages-entries',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      const index = join(outDir, 'index.html');
      await copyFile(index, join(outDir, '404.html'));
      for (const { path } of pages) {
        if (path === '/') continue;
        const dir = join(outDir, path);
        await mkdir(dir, { recursive: true });
        await copyFile(index, join(dir, 'index.html'));
      }
    },
  };
}

export default defineConfig({
  base: '/WhatTheHack/',
  plugins: [react(), tailwindcss(), githubPagesEntries()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
