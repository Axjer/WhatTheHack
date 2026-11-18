/// <reference types="vitest/config" />
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { staticEntryFiles } from './build/static-entries.ts';
import { pages } from './src/routes.ts';

/** build 完成後，把 index.html 複製成每個靜態入口檔 */
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
      for (const file of staticEntryFiles(pages.map(({ path }) => path))) {
        const target = join(outDir, file);
        await mkdir(dirname(target), { recursive: true });
        await copyFile(index, target);
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
