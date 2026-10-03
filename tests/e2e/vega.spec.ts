import { expect, test } from '@playwright/test';

const HTTP_NOT_FOUND = 404;

test('Vega talks to Antares through Alhena and renders Atria', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your world. Your story.' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Hello, HeliCraft!');
  await page.getByRole('button', { name: 'Refresh world' }).click();
  await expect(page.getByRole('status')).toHaveText('Hello, HeliCraft!');
});

test('production serves the PWA and proxies the public API', async ({
  page,
  request,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'production',
    'The service worker is produced by the Vite build.',
  );
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Hello, HeliCraft!');
  const health = await request.get('/api/health');
  expect(health.ok()).toBe(true);
  expect(health.headers()['cache-control']).toBe('no-store');
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  await expect
    .poll(
      async () =>
        await page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          return registration?.active?.state;
        }),
    )
    .toBe('activated');
  const missing = await request.get('/missing.png');
  expect(missing.status()).toBe(HTTP_NOT_FOUND);
});
