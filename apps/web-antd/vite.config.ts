import { defineConfig } from '@vben/vite-config';

import { fileViewerRenderers } from '@file-viewer/vite-plugin';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      plugins: [fileViewerRenderers({ copyAssets: true })],
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // mock代理目标地址
            target: 'http://localhost:5320/api',
            ws: true,
          },
        },
      },
    },
  };
});
