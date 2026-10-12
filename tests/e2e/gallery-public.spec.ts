// oxlint-disable no-await-in-loop -- Responsive checks resize one browser sequentially to detect overflow and hydration errors.
import type { Page, TestInfo } from '@playwright/test';
import { expect, test } from '@playwright/test';

const CONTROL = 'http://127.0.0.1:3115/__test/gallery';
test('public home handles gallery thresholds and API outage without hydration errors', async ({
  page,
  request,
}) => {
  for (const count of [0, 5, 6]) {
    await request.get(`${CONTROL}?count=${count}`);
    const response = await request.get('/', {
      headers: { Cookie: 'helicraft_session=must-not-be-forwarded' },
    });
    const observed: unknown = await (
      await request.get('http://127.0.0.1:3115/__test/observed')
    ).json();
    expect(observed).toMatchObject({ observedCookie: null });
    const html = await response.text();
    expect(response.ok()).toBe(true);
    expect(html).toContain('Minecraft, где');
    if (count > 5) {
      expect(html).toContain('TestPhotographer');
      expect(html).toContain('/gallery/11111111');
    } else {
      expect(html).toContain('Скриншот игроков HeliCraft');
    }
  }
  await request.get(`${CONTROL}?count=6&failed=true`);
  const fallback = await request.get('/');
  expect(fallback.ok()).toBe(true);
  expect(await fallback.text()).toContain('Скриншот игроков HeliCraft');
  await page.goto('/gallery');
  await expect(page.getByText('Галерея временно недоступна.', { exact: false })).toBeVisible();
});
async function responsiveScreenshots(page: Page, testInfo: TestInfo, route: string): Promise<void> {
  await page.goto(route);
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({
    path: testInfo.outputPath(`${route === '/' ? 'home' : 'gallery'}-desktop.png`),
    fullPage: true,
  });
  await page.screenshot({
    path: testInfo.outputPath(`${route === '/' ? 'home' : 'gallery'}-desktop-viewport.png`),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath(`${route === '/' ? 'home' : 'gallery'}-mobile.png`),
    fullPage: true,
  });
  await page.screenshot({
    path: testInfo.outputPath(`${route === '/' ? 'home' : 'gallery'}-mobile-viewport.png`),
  });
}
test('gallery HTML, detail, 404, keyboard menu and responsive layouts', async ({
  page,
  request,
}, testInfo) => {
  await request.get(`${CONTROL}?count=6`);
  const html = await (await request.get('/gallery')).text();
  expect(html).toContain('Галерея сообщества');
  expect(html).toContain('TestPhotographer');
  const detail = await request.get('/gallery/11111111-1111-4111-8111-000000000001');
  expect(detail.ok()).toBe(true);
  expect(await detail.text()).toContain('Вечер над городом');
  expect((await request.get('/gallery/not-a-uuid')).status()).toBe(404);
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydrat|same key/iu.test(message.text())) {
      errors.push(message.text());
    }
  });
  for (const route of ['/', '/gallery']) {
    await responsiveScreenshots(page, testInfo, route);
  }
  await page.getByRole('button', { name: 'Меню' }).click();
  await expect(page.getByRole('navigation', { name: 'Мобильная навигация' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Мобильная навигация' })).toHaveCount(0);
  expect(errors).toStrictEqual([]);
});

test('gallery remains readable and detail links work with JavaScript disabled', async ({
  browser,
  request,
  baseURL,
}) => {
  await request.get(`${CONTROL}?count=6`);
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto('/gallery');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Галерея сообщества');
    await page
      .getByRole('link', {
        name: 'Постройки игроков и пейзажи Minecraft Вечер над городом',
        exact: false,
      })
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Вечер над городом');
    await expect(page.getByText('TestPhotographer', { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('gallery pagination exposes ordinary links and SSR records for the next page', async ({
  page,
  request,
}) => {
  await request.get(`${CONTROL}?count=24`);
  await page.goto('/gallery');
  await page.getByRole('link', { name: 'Следующая' }).click();
  await expect(page).toHaveURL(/\/gallery\?page=2$/u);
  await expect(page.getByText('Страница 2 из 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Тестовый снимок 19' })).toBeVisible();
  const response = await request.get('/gallery?page=2');
  expect(await response.text()).toContain('Тестовый снимок 24');
});

test('RU and EN render on the server and language selection survives navigation', async ({
  page,
  request,
}) => {
  const response = await request.get('/?lang=en');
  const html = await response.text();
  expect(response.ok()).toBe(true);
  expect(html).toContain('<html lang="en"');
  expect(html).toContain('Minecraft for');
  expect(html).toContain('Northway');
  expect(html).toContain('Minecraft for playing together');
  expect(html).toMatch(/hreflang="en"/iu);
  expect(html).toContain('?lang=en');
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  await page.goto('/?lang=ru');
  await expect(page.getByRole('combobox', { name: 'Language / Язык' })).toHaveCount(0);
  await page.goto('/?lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Minecraft for');
  await expect(page).toHaveTitle('Minecraft for playing together · HeliCraft');
  await page.getByRole('link', { name: 'World', exact: true }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The HeliCraft world');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.goto('/world?lang=ru');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Мир HeliCraft');
  expect(errors).toStrictEqual([]);
});

test('translated gallery captions exist in SSR for each requested language', async ({
  page,
  request,
}) => {
  await request.get(`${CONTROL}?count=6`);
  const path = '/gallery/11111111-1111-4111-8111-000000000001';
  const html = await (await request.get(`${path}?lang=en`)).text();
  expect(html).toContain('Evening over the town');
  expect(html).toContain('English photograph description');
  await page.goto(`${path}?lang=ru`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Вечер над городом');
  await page.goto(`${path}?lang=en`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Evening over the town');
  await expect(page).toHaveTitle('Evening over the town · HeliCraft');
});

test('malformed account responses leave gallery navigation usable', async ({ page, request }) => {
  await request.get(`${CONTROL}?count=6`);
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: { id: '22222222-2222-4222-8222-222222222222', username: 'Legacy' },
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  await page.goto('/gallery');
  await expect(page.getByRole('combobox', { name: 'Language / Язык' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Галерея сообщества');
  await expect(page.getByRole('link', { name: 'Войти', exact: true }).first()).toBeVisible();
  expect(errors).toStrictEqual([]);
});
