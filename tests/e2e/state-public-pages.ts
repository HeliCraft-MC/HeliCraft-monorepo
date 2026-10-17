import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function assertPublicProfilePages(
  page: Page,
  input: Readonly<{ username: string; suffix: string }>,
  projectName: string,
): Promise<void> {
  const { username, suffix } = input;
  await page.screenshot({
    path: `/tmp/helicraft-state-reimagined-mobile-${projectName}.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: `/tmp/helicraft-state-reimagined-desktop-${projectName}.png`,
    fullPage: true,
  });
  const playerLink = page
    .locator('#state-citizens')
    .getByRole('link', { name: username, exact: true });
  const profilePath = await playerLink.getAttribute('href');
  expect(profilePath).toMatch(/^\/players\/[0-9a-f-]+$/u);
  await playerLink.click();
  await expect(page.getByRole('heading', { name: username, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: `Аврора ${suffix}`, exact: true })).toBeVisible();
  await page.screenshot({
    path: `/tmp/helicraft-player-profile-desktop-${projectName}.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/helicraft-player-profile-mobile-${projectName}.png`,
    fullPage: true,
  });
  await page.goto('/players/00000000-0000-4000-8000-000000000001');
  await expect(
    page.getByRole('heading', { name: 'Страница не найдена', exact: true }),
  ).toBeVisible();
}
async function assertManagementPage(
  page: Page,
  stateId: string,
  projectName: string,
): Promise<void> {
  await expect(page.getByRole('navigation', { name: 'Мой аккаунт', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Панель государства', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Добро пожаловать в панель государства', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Управление государством', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/helicraft-management-mobile-${projectName}.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: `/tmp/helicraft-management-desktop-${projectName}.png`,
    fullPage: true,
  });
  await page.goto(`/app/states/${stateId}`);
}
async function assertStateFits(page: Page): Promise<void> {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
  ).toBe(true);
}
export { assertPublicProfilePages, assertManagementPage, assertStateFits };
