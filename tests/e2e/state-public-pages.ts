import { DraftSchema } from '../../apps/antares/src/modules/states/contracts';
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
async function assertStateFits(page: Page): Promise<void> {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
  ).toBe(true);
}
async function assertReformEditor(page: Page, projectName: string): Promise<void> {
  await page.getByRole('button', { name: 'Предложить изменение', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Черновик реформы', exact: true })).toBeVisible();
  await expect(page.getByLabel('Адрес государства', { exact: true })).toBeDisabled();
  await page
    .getByLabel('Описание · Русский', { exact: true })
    .fill('Черновик реформы с сохранением переводов');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /Подготовка реформы/u }).click();
  await page.getByRole('button', { name: '10. Голосования', exact: true }).click();
  const rule = page.getByRole('checkbox', {
    name: 'Завершать, когда решение уже невозможно изменить',
    exact: true,
  });
  await expect(rule).toBeChecked();
  await rule.uncheck();
  const draftId = new URL(page.url()).pathname.split('/').pop();
  await expect
    .poll(async () => {
      const response = await page.request.get(`/api/v1/account/state-drafts/${draftId}`);
      return DraftSchema.parse(await response.json()).configuration.governance.votingDefaults
        .closeWhenDecided;
    })
    .toBe(false);
  await page.reload();
  await expect(rule).not.toBeChecked();
  await page.getByRole('button', { name: /Подготовка реформы/u }).click();
  await page.getByRole('button', { name: '1. Основные данные', exact: true }).click();
  await expect(page.getByLabel('Описание · Русский', { exact: true })).toHaveValue(
    'Черновик реформы с сохранением переводов',
  );
  await assertStateFits(page);
  await page.screenshot({
    path: `/tmp/ux2-state-reform-mobile-${projectName}.png`,
    fullPage: true,
  });
}
async function assertManagementPage(
  page: Page,
  stateId: string,
  projectName: string,
): Promise<void> {
  await expect(page.getByRole('navigation', { name: 'Мой аккаунт', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Обзор', exact: true })).toBeVisible();
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
  await assertReformEditor(page, projectName);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/app/states/${stateId}`);
}

export { assertPublicProfilePages, assertManagementPage, assertStateFits };
