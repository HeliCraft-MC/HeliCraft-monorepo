import { expect, test } from '@playwright/test';
import { parseObservations } from './company-catalogue-observation';

const CONTROL = 'http://127.0.0.1:3116/__test';
const COMPANY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
test.beforeEach(async ({ request }) => {
  await request.get(`${CONTROL}/catalogue`);
});
test('published company profile is present without JavaScript and never forwards account cookies', async ({
  request,
  browser,
}) => {
  const response = await request.get(`/companies/${COMPANY_ID}?lang=en`, {
    headers: { Cookie: 'helicraft_session=private-profile-session' },
  });
  const html = await response.text();
  expect(response.ok()).toBe(true);
  expect(html).toContain('PublicOfficer');
  expect(html).toContain('--company-accent:#338899');
  expect(html).toContain(
    `/api/v1/public/companies/${COMPANY_ID}/media/11111111-1111-4111-8111-111111111111`,
  );
  expect(html).toContain(
    `/api/v1/public/companies/${COMPANY_ID}/media/22222222-2222-4222-8222-222222222222`,
  );
  expect(html).toContain('Published formal charter');
  expect(html).toContain('Registered foreign branch');
  expect(html).toContain('900719925474099312345');
  expect(html).not.toContain('private-profile-session');
  expect(html).not.toMatch(/"(?:balanceMinor|quoteId|calculation|accounts)":/u);
  const observed = parseObservations(await (await request.get(`${CONTROL}/observed`)).json());
  expect(
    observed.observations.some((item) => item.path === `/api/v1/public/companies/${COMPANY_ID}`),
  ).toBe(true);
  expect(observed.observations.every((item) => item.cookie === null)).toBe(true);
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(new URL(`/companies/${COMPANY_ID}?lang=en`, response.url()).href);
    await expect(
      page.getByRole('heading', { name: 'Published company 1', exact: true }),
    ).toBeVisible();
    await page.locator('summary').filter({ hasText: 'Authorized representative' }).click();
    await expect(page.getByText('PublicOfficer', { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText('900719925474099312345 / 900719925474099312345 (100.00%)'),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
test('catalogue opens the real public profile and long identities fit mobile layouts', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  await page.goto('/companies?lang=en');
  await page.getByRole('link', { name: 'Published company 1', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Governance and offices' })).toBeVisible();
  await expect(page.locator('main img').first()).toBeVisible();
  await page.screenshot({
    path: `/tmp/company-profile-desktop-${testInfo.project.name}.png`,
    fullPage: true,
    caret: 'initial',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/companies/${COMPANY_ID}?lang=ru`);
  await expect(page.getByRole('heading', { name: 'Акционеры', exact: true })).toBeVisible();
  const logoBounds = await page.locator('main header img[width="96"]').boundingBox();
  if (logoBounds === null) {
    throw new Error('Company logo is missing');
  }
  expect(logoBounds.width).toBeCloseTo(logoBounds.height, 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `/tmp/company-profile-mobile-${testInfo.project.name}.png`,
    fullPage: true,
    caret: 'initial',
  });
  expect(errors).toEqual([]);
});
