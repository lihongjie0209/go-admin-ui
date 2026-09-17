import { fileURLToPath } from 'node:url';

import Vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [Vue()],
  resolve: { alias: { '#': fileURLToPath(new URL('src', import.meta.url)) } },
  test: {
    include: ['tests/business/**/*.test.mjs'],
    environment: 'happy-dom',
    watch: false,
    maxWorkers: 1,
    clearMocks: true,
  },
});
