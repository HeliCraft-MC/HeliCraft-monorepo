import { generateSW } from 'workbox-build';

// Start builds server and client environments separately. Generate only after both finish.
// No navigation fallback or runtime cache: HTML, API data and private routes stay online-only.
const result = await generateSW({
  globDirectory: 'dist/client',
  globPatterns: ['assets/*.{js,css,woff2}', 'icon-*.png'],
  swDest: 'dist/client/sw.js',
  cleanupOutdatedCaches: true,
  skipWaiting: true,
  clientsClaim: true,
  navigateFallback: null,
});
for (const warning of result.warnings) {
  console.warn(warning);
}
console.info(`Service worker: ${result.count} static assets`);
