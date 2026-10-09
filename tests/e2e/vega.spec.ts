// oxlint-disable no-await-in-loop -- Responsive assertions resize the same browser page sequentially; concurrent resizing would race.
import { expect, test } from '@playwright/test';

const PASSWORD = 'Browser test password 2026';
const HTTP_NOT_FOUND = 404;

test('public pages render real Russian HTML before JavaScript and fit mobile screens', async ({
  page,
  request,
}) => {
  const response = await request.get('/');
  const html = await response.text();
  expect(response.ok()).toBe(true);
  expect(html).toContain('<html lang="ru"');
  expect(html).toContain('Построй не просто дом.');
  expect(html).toContain('rel="canonical"');
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Оставь след');
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  expect(errors).toStrictEqual([]);
  const missing = await request.get('/missing-page-for-test');
  expect(missing.status()).toBe(HTTP_NOT_FOUND);
});

test('registration, persistent UUID, account rename and skin lifecycle', async ({ page }) => {
  const username = `p${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
  await page.goto('/');
  await page.getByRole('link', { name: 'Начать свою историю', exact: false }).click();
  await page.getByLabel('Ник', { exact: true }).fill(username);
  await page.getByLabel('Пароль', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Повтори пароль').fill(PASSWORD);
  await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/u);
  const before = await page.request.get('/api/v1/auth/me');
  const identity: unknown = await before.json();
  expect(identity).toHaveProperty('username', username);
  await page.goto('/app/settings/profile');
  await page.getByLabel('Новый ник').fill(`${username}x`);
  await page.getByLabel('Текущий пароль', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Сохранить ник' }).click();
  await expect(page.getByRole('status')).toContainText('UUID сохранился');
  const after = await page.request.get('/api/v1/auth/me');
  const renamed: unknown = await after.json();
  if (
    typeof identity !== 'object' ||
    identity === null ||
    !('id' in identity) ||
    typeof identity.id !== 'string'
  ) {
    throw new Error('Invalid identity DTO');
  }
  expect(renamed).toMatchObject({ id: identity.id, username: `${username}x` });
  await page.goto('/app/settings/skin');
  await page.getByLabel('PNG-скин').setInputFiles('apps/antares/tests/fixtures/modern-overlay.png');
  await page.getByLabel('Модель', { exact: true }).selectOption('SLIM');
  await page.getByRole('button', { name: 'Сохранить скин' }).click();
  await expect(page.getByRole('status')).toContainText('Скин сохранён');
  await expect(page.getByText('Текущий скин: SLIM')).toBeVisible();
  await page.getByRole('button', { name: 'Сбросить скин' }).click();
  await expect(page.getByRole('status')).toContainText('Кастомный скин сброшен');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/app$/u);
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page).toHaveURL(/\/$/u);
  const loggedOut = await page.request.get('/api/v1/auth/me');
  expect(loggedOut.status()).toBe(401);
  await page.goto('/app');
  await expect(page).toHaveURL(/\/login/u);
});

test('editor publishes sanitized Markdown and guests receive the new SSR article', async ({
  page,
  request,
}) => {
  const slug = `story-${crypto.randomUUID()}`;
  await page.goto('/login?returnTo=/admin/chronicle/new');
  await page.getByLabel('Ник', { exact: true }).fill('E2eEditor');
  await page.getByLabel('Пароль', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/chronicle\/new$/u);
  await page.getByLabel('Название', { exact: true }).fill('История браузерного теста');
  await page.getByLabel('Адрес страницы').fill(slug);
  await page.getByLabel('Краткое описание').fill('Проверка публикации без пересборки.');
  await page
    .getByLabel('Markdown', { exact: true })
    .fill('# История\n\n**Настоящий текст**\n\n<script>window.pwned=true</script>');
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/chronicle\/[\da-f-]+$/u);
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(page.getByText('Статус: PUBLISHED', { exact: false })).toBeVisible();
  const published = await request.get(`/chronicle/${slug}`);
  expect(published.ok()).toBe(true);
  const html = await published.text();
  expect(html).toContain('<strong>Настоящий текст</strong>');
  expect(html).not.toContain('<script>window.pwned=true</script>');
  await page.getByLabel('Адрес страницы').fill(`${slug}-renamed`);
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Снять с публикации', exact: true })).toBeEnabled();
  await expect
    .poll(async () => {
      const moved = await request.get(`/chronicle/${slug}`, { maxRedirects: 0 });
      return moved.status();
    })
    .toBe(301);
  await page.getByRole('button', { name: 'Снять с публикации', exact: true }).click();
  await expect(page.getByText('Статус: DRAFT', { exact: false })).toBeVisible();
  const hidden = await request.get(`/chronicle/${slug}-renamed`);
  expect(hidden.status()).toBe(HTTP_NOT_FOUND);
  const denied = await page.request.get('/api/v1/admin/users');
  expect(denied.status()).toBe(403);
});

test('production serves public assets and never caches private API responses', async ({
  page,
  request,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'production',
    'The service worker is generated only by the production build.',
  );
  await page.goto('/');
  const health = await request.get('/api/health');
  expect(health.ok()).toBe(true);
  expect(health.headers()['cache-control']).toBe('no-store');
  expect((await request.get('/manifest.webmanifest')).ok()).toBe(true);
  await expect
    .poll(
      async () =>
        await page.evaluate(
          async () => (await navigator.serviceWorker.getRegistration())?.active?.state,
        ),
    )
    .toBe('activated');
});
