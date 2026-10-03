import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { VitePWA as vitePwa } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../..', '');
  return {
    envDir: '../..',
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      vitePwa({
        registerType: 'autoUpdate',
        manifest: {
          name: 'HeliCraft Vega',
          short_name: 'Vega',
          description: 'Your HeliCraft world',
          theme_color: '#0b1220',
          background_color: '#0b1220',
          display: 'standalone',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: { navigateFallbackDenylist: [/^\/api\//u, /^\/openapi\.json$/u] },
      }),
    ],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': env.API_PROXY_TARGET ?? 'http://localhost:3000',
        '/openapi.json': env.API_PROXY_TARGET ?? 'http://localhost:3000',
      },
    },
  };
});
