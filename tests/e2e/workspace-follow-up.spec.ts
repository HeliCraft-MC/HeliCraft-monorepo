// oxlint-disable max-lines-per-function, max-statements -- A real account lifecycle verifies exclusive editing, help pinning and the current navigation marker together.
import { expect } from '@playwright/test';
import { test } from './fixtures';
import { SiteSettingsSchema } from '../../apps/antares/src/modules/site-settings/contracts';
import { PASSWORD, register, post } from './taxation-fixture';

function originOf(value: string | undefined): string {
  if (value === undefined) {
    throw new Error('Missing browser origin');
  }
  return value;
}
test('account editing uses a wide workspace, exclusive document views and hover/pinned field help', async ({
  page,
}, testInfo) => {
  const origin = originOf(testInfo.project.use.baseURL);
  const name = `w${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`;
  await register(page.request, origin, name);
  await page.setViewportSize({ width: 1600, height: 1050 });
  const skinImage = page.waitForResponse('**/api/v1/public/players/*/skin.png?*');
  await page.goto('/app');
  const navigation = page.getByRole('navigation', { name: 'Мой аккаунт', exact: true });
  await expect(navigation.getByRole('link', { name: 'Обзор', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  const bounds = await navigation.boundingBox();
  expect(bounds?.x).toBeLessThan(40);
  await expect(
    page.locator('main section').getByRole('heading', { name: 'Скин', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel('3D-просмотр скина: перетаскивайте для вращения', { exact: true }),
  ).toBeVisible();
  expect((await skinImage).ok()).toBe(true);
  await page.evaluate(() => {
    globalThis.scrollTo(0, 0);
  });
  await page.screenshot({
    path: `/tmp/workspace-account-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await navigation.getByRole('link', { name: 'Государства', exact: true }).click();
  await page.getByRole('button', { name: 'Создать новый черновик', exact: true }).click();
  const current = navigation.getByRole('link', { name: 'Государства', exact: true });
  await expect(current).toHaveAttribute('aria-current', 'page');
  await expect(current).toHaveAccessibleName('Государства');
  await page.getByRole('button', { name: '5. Шаблон и режим', exact: true }).click();
  await page.getByRole('button', { name: 'Автократия', exact: true }).click();
  await page.getByRole('button', { name: '9. Государственные решения', exact: true }).click();
  const help = page.getByRole('button', { name: 'ⓘ Кто принимает решение?', exact: true }).first();
  await help.hover();
  const explanation = page.getByText(
    'Укажите должности или избирателей, чьё одобрение требуется.',
    { exact: false },
  );
  await expect(explanation).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(explanation).not.toBeVisible();
  await help.hover();
  await expect(explanation).toBeVisible();
  await help.click();
  await page.mouse.move(0, 0);
  await expect(explanation).toBeVisible();
  await help.click();
  await expect(explanation).not.toBeVisible();
  await help.click();
  await page.locator('main').getByRole('heading').first().click();
  await expect(explanation).not.toBeVisible();
  await page.getByRole('button', { name: '11. Конституция', exact: true }).click();
  await page.getByLabel('Формальная Конституция', { exact: true }).selectOption('YES');
  await page.getByRole('button', { name: 'Исходный Markdown', exact: true }).click();
  const source = '# Наш документ\n\n{{block.FOUNDERS}}\n\nПраво на участие.';
  await page.getByLabel('Текст Конституции · RU', { exact: true }).fill(source);
  const field = await page.getByLabel('Текст Конституции · RU', { exact: true }).boundingBox();
  expect(field?.width).toBeGreaterThan(800);
  await page.getByRole('button', { name: 'Превью документа', exact: true }).click();
  await expect(page.getByLabel('Текст Конституции · RU', { exact: true })).toHaveCount(0);
  const preview = page.getByRole('region', { name: 'Живой предпросмотр', exact: true });
  await expect(preview.getByRole('heading', { name: 'Наш документ', exact: true })).toBeVisible();
  await expect(preview.getByRole('link', { name, exact: true })).toBeVisible();
  await preview.getByRole('link', { name, exact: true }).hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.mouse.move(0, 0);
  await page.getByRole('button', { name: 'Текстовый редактор', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Текст Конституции · RU', exact: true }),
  ).toContainText('Наш документ');
  await expect(preview).toHaveCount(0);
  await page.getByRole('button', { name: 'Исходный Markdown', exact: true }).click();
  await expect(page.getByLabel('Текст Конституции · RU', { exact: true })).toHaveValue(source);
  await page.evaluate(() => {
    globalThis.scrollTo(0, 0);
  });
  await page.screenshot({
    path: `/tmp/workspace-document-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: '12. Проверка', exact: true }).click();
  await expect(page.getByText('Адрес публичной страницы', { exact: true })).toBeVisible();
  await expect(page.getByText('Цвет государства на сайте', { exact: true })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/#[0-9a-f]{6}/iu);
  const decisions = page
    .getByRole('heading', { name: 'Государственные решения', exact: true })
    .locator('xpath=following-sibling::dl[1]')
    .locator(':scope > div');
  const first = await decisions.nth(0).boundingBox();
  const second = await decisions.nth(1).boundingBox();
  if (first === null || second === null) {
    throw new Error('Missing review decisions');
  }
  expect(second.y).toBeGreaterThan(first.y + first.height);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
  ).toBe(true);
});

test('administration groups institutions and applies server branding to SSR, metadata, icons and installation', async ({
  page,
  browser,
}, testInfo) => {
  const origin = originOf(testInfo.project.use.baseURL);
  await post(page.request, '/auth/login', {
    origin,
    data: { username: 'E2eOwner', password: PASSWORD },
  });
  const response = await page.request.get('/api/v1/admin/site-settings');
  const original = SiteSettingsSchema.parse(await response.json());
  const brand = `Aurora ${testInfo.project.name}`;
  const headers = { Origin: origin };
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/admin/institutions');
    await expect(
      page
        .getByRole('navigation', { name: 'Администрация', exact: true })
        .getByRole('link', { name: 'Институты', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    await page.getByLabel('Выберите институт', { exact: true }).selectOption('tax');
    await expect(
      page.getByRole('heading', { name: 'Налоговые службы', exact: true }),
    ).toBeVisible();
    await page.getByLabel('Выберите институт', { exact: true }).selectOption('bank');
    await expect(
      page.getByRole('heading', { name: 'Центральные банки', exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Настройки сервера', exact: true }).click();
    await page.getByLabel('Название сервера', { exact: true }).fill(brand);
    await page
      .getByLabel('Адрес сервера Minecraft', { exact: true })
      .fill('play.example.test:25565');
    await page.getByLabel('GitHub', { exact: true }).fill('https://github.com/example/server');
    await page.getByRole('button', { name: 'Сохранить настройки', exact: true }).click();
    await expect(page.getByText('Настройки сохранены', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('banner').getByRole('link', { name: `${brand} — главная`, exact: true }),
    ).toBeVisible();
    await page
      .getByLabel('Новый логотип', { exact: true })
      .setInputFiles('apps/antares/tests/fixtures/state-flag.png');
    await page.getByRole('button', { name: 'Загрузить логотип', exact: true }).click();
    await expect(page.getByText('Логотип обновлён', { exact: true })).toBeVisible();
    await expect(page.getByRole('banner').locator('img').first()).toHaveAttribute(
      'src',
      /\/api\/v1\/public\/site\/logo.png\?v=/u,
    );
    await page.evaluate(() => {
      globalThis.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `/tmp/workspace-settings-${testInfo.project.name}.png`,
      fullPage: true,
    });
    const reader = await browser.newContext({ baseURL: origin, javaScriptEnabled: false });
    try {
      const publicPage = await reader.newPage();
      await publicPage.goto('/world');
      await expect(
        publicPage.getByRole('heading', { name: `Мир ${brand}`, exact: true }),
      ).toBeVisible();
      await expect(publicPage).toHaveTitle(`Мир ${brand} · ${brand}`);
      await expect(publicPage.locator('link[rel="icon"]')).toHaveAttribute(
        'href',
        /\/api\/v1\/public\/site\/logo.png\?v=/u,
      );
      await expect(publicPage.getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute(
        'href',
        'https://github.com/example/server',
      );
      const manifest = await reader.request.get('/manifest.webmanifest');
      expect(manifest.ok()).toBe(true);
      expect(manifest.headers()['content-type']).toContain('application/manifest+json');
      expect(await manifest.json()).toMatchObject({
        name: brand,
        short_name: brand,
        scope: '/',
        start_url: '/',
      });
    } finally {
      await reader.close();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
    ).toBe(true);
    await page.evaluate(() => {
      globalThis.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `/tmp/workspace-settings-mobile-${testInfo.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await page.request.delete('/api/v1/admin/site-settings/logo', { headers });
    await page.request.put('/api/v1/admin/site-settings', {
      headers,
      data: {
        serverName: original.serverName,
        minecraftAddress: original.minecraftAddress,
        githubUrl: original.githubUrl,
      },
    });
  }
});
