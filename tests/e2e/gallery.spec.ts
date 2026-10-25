import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { test } from './fixtures';

const PASSWORD = 'Browser test password 2026';
async function verifyPreferences(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Привет,');
  await page.getByRole('link', { name: 'Профиль', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Профиль', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Настройки', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Язык интерфейса' })).toBeVisible();
  await page.getByLabel('Language / Язык').selectOption('en');
  await expect(page.getByRole('heading', { name: 'Interface language' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Interface language' })).toBeVisible();
  await page.getByLabel('Language / Язык').selectOption('ru');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
}

async function tagPlayers(page: Page): Promise<void> {
  await page.getByLabel('Игроки на снимке', { exact: true }).fill('E2e');
  await page.getByRole('button', { name: 'E2eOwner', exact: true }).click();
  await page.getByLabel('Игроки на снимке', { exact: true }).fill('E2e');
  await page.getByRole('button', { name: 'E2eEditor', exact: true }).click();
  await page.getByRole('button', { name: 'Удалить: E2eOwner' }).click();
  await page.getByRole('button', { name: 'Я есть на снимке' }).click();
  const states = page.getByRole('group', { name: 'Связанные государства', exact: true });
  await states.getByLabel('Связь со снимком', { exact: true }).selectOption('PARTICIPANT');
  await states.getByRole('button', { name: 'Проверка страниц граждан', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
}

async function photoScreenshots(page: Page, projectName: string): Promise<void> {
  await expect(page.getByText('Редактировать подписи', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Проверка страниц граждан', exact: true }),
  ).toHaveAttribute('href', '/states/e2e-pagination');
  const previewRequest = page.waitForRequest(
    (request) => new URL(request.url()).pathname === '/api/v1/public/states/e2e-pagination',
  );
  await page.getByRole('link', { name: 'Проверка страниц граждан', exact: true }).hover();
  const requested = await previewRequest;
  const publicHeaders = await requested.allHeaders();
  expect(publicHeaders.cookie).toBeUndefined();
  await expect(page.getByRole('tooltip')).toContainText('Граждане: 11');
  await page.keyboard.press('Escape');
  await page.screenshot({
    path: `/tmp/helicraft-photo-owner-desktop-${projectName}.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `/tmp/helicraft-photo-owner-mobile-${projectName}.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });
}

async function clickWithoutReload(page: Page, name: string): Promise<void> {
  const previousUrl = page.url();
  await page.evaluate(() => {
    document.documentElement.dataset.galleryDocument = 'preserved';
  });
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page).not.toHaveURL(previousUrl);
  expect(await page.evaluate(() => document.documentElement.dataset.galleryDocument)).toBe(
    'preserved',
  );
}

test('player uploads a photograph, guests see SSR detail and owner removes it', async ({
  page,
  request,
}) => {
  const username = `g${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
  await page.goto('/register');
  await page.getByLabel('Ник', { exact: true }).fill(username);
  await page.getByLabel('Пароль', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Повтори пароль').fill(PASSWORD);
  await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/u);
  await verifyPreferences(page);
  await page.goto('/app/gallery/new');
  await expect(page.getByRole('navigation', { name: 'Мой аккаунт' })).toBeVisible();
  await page
    .getByLabel('Фотография', { exact: true })
    .setInputFiles('apps/vega/public/world/town.webp');
  await page.locator('[name="title"]').fill('Наш город');
  await page.locator('[name="alt"]').fill('Дома вокруг городской площади');
  await page.locator('[name="description"]').fill('Место встречи друзей.');
  await page.getByLabel('Язык текста').selectOption('en');
  await page.locator('[name="translation:en:title"]').fill('Our town');
  await page.locator('[name="translation:en:alt"]').fill('Houses around the square');
  await page.getByLabel('Язык текста').selectOption('ru');
  await expect(page.locator('[name="title"]')).toHaveValue('Наш город');
  await tagPlayers(page);
  await clickWithoutReload(page, 'Опубликовать снимок');
  await expect(page).toHaveURL(/\/gallery\/[\da-f-]+$/u);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Наш город');
  await photoScreenshots(page, test.info().project.name);
  const detailUrl = page.url();
  const detail = await request.get(detailUrl);
  expect(await detail.text()).toContain('Место встречи друзей.');
  expect(await (await request.get(`${detailUrl}?lang=en`)).text()).toContain('Our town');
  await page.getByText('Редактировать подписи', { exact: true }).click();
  await page.screenshot({
    path: `/tmp/helicraft-photo-editor-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Удалить: E2eEditor' }).click();
  await page.getByLabel('Язык текста').selectOption('en');
  await page.locator('[name="translation:en:title"]').fill('Our harbour');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Сохранено');
  expect(await (await request.get(`${detailUrl}?lang=en`)).text()).toContain('Our harbour');
  await page.getByRole('button', { name: 'Удалить мой снимок' }).click();
  await clickWithoutReload(page, 'Да, удалить');
  await expect(page).toHaveURL((url) => url.pathname === '/gallery');
  expect((await request.get(detailUrl)).status()).toBe(404);
});
