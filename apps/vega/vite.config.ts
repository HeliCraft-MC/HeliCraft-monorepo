import { defineConfig, loadEnv } from 'vite';
import type { ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { VitePWA as vitePwa } from 'vite-plugin-pwa';

function proxyConfig(target: string): Record<string, string | ProxyOptions> {
  return {
    '/api': target,
    '/openapi.json': target,
    '/robots.txt': { target, rewrite: (): string => '/api/v1/public/robots.txt' },
    '/sitemap.xml': { target, rewrite: (): string => '/api/v1/public/sitemap.xml' },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../..', '');
  const apiTarget = process.env.API_PROXY_TARGET ?? env.API_PROXY_TARGET ?? 'http://localhost:3000';
  process.env.API_PROXY_TARGET = apiTarget;
  return {
    envDir: '../..',
    optimizeDeps: {
      // Start owns entry discovery and excludes its router so server-function transforms run.
      include: ['@tanstack/react-query'],
      // Release the initial bundle before Start's client warmup finishes crawling imports.
      holdUntilCrawlEnd: false,
    },
    plugins: [
      tanstackStart(),
      react(),
      vitePwa({
        outDir: 'dist/client',
        injectRegister: null,
        registerType: 'autoUpdate',
        manifest: {
          name: 'HeliCraft Vega',
          short_name: 'Vega',
          description: 'Your HeliCraft world',
          theme_color: '#0e0a06',
          background_color: '#0e0a06',
          display: 'standalone',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: {
          navigateFallback: null,
          globPatterns: ['**/*.{js,css,woff2,png,svg}'],
          globIgnores: ['**/server/**'],
        },
      }),
    ],
    server: {
      port: 5173,
      strictPort: true,
      warmup: { clientFiles: ['./src/client.tsx'] },
      proxy: proxyConfig(apiTarget),
    },
  };
});
