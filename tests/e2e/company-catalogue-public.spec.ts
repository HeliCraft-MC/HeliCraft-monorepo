import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { parseObservations } from './company-catalogue-observation';

const CONTROL = 'http://127.0.0.1:3116/__test';
const STATE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
async function catalogueScreenshots(page: Page, testInfo: TestInfo): Promise<void> {
  await page.screenshot({
    path: `/tmp/company-catalogue-desktop-${testInfo.project.name}.png`,
    fullPage: true,
    caret: 'initial',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `/tmp/company-catalogue-mobile-${testInfo.project.name}.png`,
    fullPage: true,
    caret: 'initial',
  });
}
test.beforeEach(async ({ request }) => {
  await request.get(`${CONTROL}/catalogue`);
});
test('SSR contains real published fields and dynamic SEO without forwarding session cookies', async ({
  request,
  browser,
}) => {
  const response = await request.get('/companies?lang=en', {
    headers: { Cookie: 'helicraft_session=must-not-be-forwarded' },
  });
  const html = await response.text();
  expect(response.ok()).toBe(true);
  expect(html).toContain('Published company 1');
  expect(html).toContain('Published jurisdiction');
  expect(html).toContain('Catalogue Test Realm');
  expect(html).toContain('https://catalogue.example.test/companies?lang=en');
  expect(html).not.toContain('balanceMinor');
  expect(html).not.toContain('must-not-be-forwarded');
  const observed = parseObservations(await (await request.get(`${CONTROL}/observed`)).json());
  expect(observed.observations.some((item) => item.path.endsWith('/companies/catalogue'))).toBe(
    true,
  );
  expect(observed.observations.every((item) => item.cookie === null)).toBe(true);
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(new URL('/companies?lang=en', response.url()).href);
    await expect(
      page.getByRole('heading', { name: 'Published company 1', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('October 18, 2026', { exact: true }).first()).toBeVisible();
    await page.getByLabel('Search', { exact: true }).fill('Literal_% & text');
    await page.getByLabel('Registration jurisdiction', { exact: true }).selectOption(STATE_ID);
    await page.getByLabel('Status', { exact: true }).selectOption('ALL');
    await page.getByLabel('Sort', { exact: true }).selectOption('NAME');
    await page.getByRole('button', { name: 'Find companies' }).click();
    expect(new URL(page.url()).searchParams.get('search')).toBe('Literal_% & text');
    expect(new URL(page.url()).searchParams.get('stateId')).toBe(STATE_ID);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  } finally {
    await context.close();
  }
});
test('filter submission, pagination, reset and mobile keyboard access keep public state', async ({
  page,
  request,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  await page.goto('/companies?lang=en');
  await expect(page.getByRole('link', { name: 'Next', exact: true })).toBeVisible();
  await page.getByLabel('Search', { exact: true }).fill('Published');
  await page.getByLabel('Registration jurisdiction', { exact: true }).selectOption(STATE_ID);
  await page.getByLabel('Status', { exact: true }).selectOption('ALL');
  await page.getByLabel('Sort', { exact: true }).selectOption('OLDEST');
  await page.getByRole('button', { name: 'Find companies' }).click();
  await expect(page.getByLabel('Search', { exact: true })).toHaveValue('Published');
  await page.getByRole('link', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 2 / 3', { exact: true })).toBeVisible();
  expect(Object.fromEntries(new URL(page.url()).searchParams)).toMatchObject({
    search: 'Published',
    stateId: STATE_ID,
    status: 'ALL',
    sort: 'OLDEST',
    page: '2',
    lang: 'en',
  });
  const observed = parseObservations(await (await request.get(`${CONTROL}/observed`)).json());
  expect(
    observed.observations.some(
      (item) => item.query.page === '2' && item.query.stateId === STATE_ID,
    ),
  ).toBe(true);
  expect(observed.observations.every((item) => item.cookie === null)).toBe(true);
  await page.getByRole('link', { name: 'Reset', exact: true }).click();
  await expect(page.getByLabel('Search', { exact: true })).toHaveValue('');
  await catalogueScreenshots(page, testInfo);
  const search = page.getByLabel('Search', { exact: true });
  await search.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Registration jurisdiction', { exact: true })).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('heading', { name: 'Companies', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('outage is distinct from an empty published catalogue', async ({ page, request }) => {
  await request.get(`${CONTROL}/catalogue?mode=empty`);
  await page.goto('/companies?lang=en');
  await expect(page.getByRole('heading', { name: 'No companies found' })).toBeVisible();
  await request.get(`${CONTROL}/catalogue?mode=outage`);
  await page.reload();
  await expect(
    page.getByText('The company catalogue is temporarily unavailable. Please try again later.'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No companies found' })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});
