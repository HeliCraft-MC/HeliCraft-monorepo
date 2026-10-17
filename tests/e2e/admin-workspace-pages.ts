import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function assertAdminWorkspacePages(page: Page, projectName: string): Promise<void> {
  await expect(page.getByRole('navigation', { name: 'Администрация', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/helicraft-admin-audit-mobile-${projectName}.png`,
    fullPage: true,
  });
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { name: 'Рабочее пространство', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/helicraft-admin-home-mobile-${projectName}.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: `/tmp/helicraft-admin-home-desktop-${projectName}.png`,
    fullPage: true,
  });
  await page.goto('/admin/users');
  await expect(page.getByRole('table')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/helicraft-admin-users-mobile-${projectName}.png`,
    fullPage: true,
  });
}
export { assertAdminWorkspacePages };
