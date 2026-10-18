import { expect } from '@playwright/test';
import { test } from './fixtures';

test('citizens use ten-person GET pages without JavaScript and preserve language', async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    javaScriptEnabled: false,
  });
  try {
    const page = await context.newPage();
    await page.goto('/states/e2e-pagination?lang=en');
    await expect(page.locator('#state-citizens li')).toHaveCount(10);
    const pagination = page.getByRole('navigation', { name: 'Citizen pages', exact: true });
    await pagination.getByRole('link', { name: 'Next', exact: true }).click();
    await expect(page).toHaveURL(/citizenPage=2/u);
    await expect(page.locator('#state-citizens li')).toHaveCount(1);
    await expect(pagination).toContainText('Page 2/2');
    await pagination.getByRole('link', { name: 'Previous', exact: true }).click();
    await expect(page.locator('#state-citizens li')).toHaveCount(10);
    await page.goto('/states/e2e-pagination?lang=en&citizenPage=9999');
    await expect(page.locator('#state-citizens li')).toHaveCount(1);
    await expect(pagination).toContainText('Page 2/2');
  } finally {
    await context.close();
  }
});
