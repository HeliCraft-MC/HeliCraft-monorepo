import { expect, test } from '@playwright/test';
import { createTaxState, post, register, PASSWORD } from './taxation-fixture';

function unreleased(): void {
  throw new Error('Request gate was not initialized');
}

test('client JavaScript hydrates the sign-in form', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Войти', exact: true })).toBeEnabled();
  expect(errors).toStrictEqual([]);
});

// oxlint-disable-next-line max-lines-per-function, max-statements -- One real browser lifecycle verifies state switching, role-derived navigation, loading and responsive layout.
test('state workspace is separate, themed, interactive and scoped to current authority', async ({
  page,
  browser,
}, testInfo) => {
  const origin = testInfo.project.use.baseURL;
  if (origin === undefined) {
    throw new Error('Missing test origin');
  }
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 8);
  const citizenContext = await browser.newContext({ baseURL: origin });
  const adminContext = await browser.newContext({ baseURL: origin });
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  try {
    const citizenId = await register(citizenContext.request, origin, `c${suffix}`);
    const founderId = await register(page.request, origin, `f${suffix}`);
    const first = await createTaxState(page.request, {
      origin,
      founderId,
      cofounderId: citizenId,
      slug: `first-${suffix}`,
      name: 'Северный союз',
      color: '#275dce',
    });
    const second = await createTaxState(page.request, {
      origin,
      founderId,
      cofounderId: citizenId,
      slug: `second-${suffix}`,
      name: 'Южный союз',
      color: '#b43d7c',
    });
    await post(adminContext.request, '/auth/login', {
      origin,
      data: { username: 'E2eOwner', password: PASSWORD },
    });
    await post(adminContext.request, `/admin/states/${first}/status`, {
      origin,
      data: { status: 'ACTIVE', reason: 'Workspace browser fixture reviewed' },
    });
    await post(adminContext.request, `/admin/states/${second}/status`, {
      origin,
      data: { status: 'ACTIVE', reason: 'Workspace browser fixture reviewed' },
    });
    let release = unreleased;
    // oxlint-disable-next-line promise/avoid-new -- Hold an actual API response until its loading indicator has been observed.
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**/api/v1/account/states/${first}?locale=ru`, async (route) => {
      const response = await route.fetch();
      await gate;
      await route.fulfill({ response });
    });
    await page.goto(`/app/states/${first}/manage`);
    await expect(page.getByText('Загрузка государства…', { exact: true })).toBeVisible();
    release();
    await expect(page.getByRole('heading', { name: 'Обзор', exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Мой аккаунт', exact: true })).toHaveCount(0);
    const nav = page.getByRole('navigation', { name: 'Управление государством', exact: true });
    await expect(nav.getByRole('link', { name: 'Казна', exact: true })).toBeVisible();
    await expect(page.getByLabel('Текущее государство')).toBeEnabled();
    expect(
      await page
        .locator('main')
        .evaluate((element) => getComputedStyle(element).getPropertyValue('--state-accent').trim()),
    ).toBe('#275dce');
    const documentId = await page.evaluate(() => performance.timeOrigin);
    await nav.getByRole('link', { name: 'Граждане', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByLabel('Найти гражданина').fill(`c${suffix}`);
    await expect(
      page.locator('main').getByRole('link', { name: `c${suffix}`, exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('main').getByRole('link', { name: `f${suffix}`, exact: true }),
    ).toHaveCount(0);
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentId);
    await page.getByLabel('Текущее государство').selectOption(second);
    await expect(page).toHaveURL(new RegExp(`${second}/manage\\?section=overview$`, 'u'));
    await expect(page.getByRole('heading', { name: 'Южный союз', exact: true })).toBeVisible();
    expect(
      await page
        .locator('main')
        .evaluate((element) => getComputedStyle(element).getPropertyValue('--state-accent').trim()),
    ).toBe('#b43d7c');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `/tmp/state-workspace-mobile-${testInfo.project.name}.png`,
      fullPage: true,
    });
    const citizen = await citizenContext.newPage();
    await citizen.goto(`/app/states/${first}/manage`);
    const citizenNav = citizen.getByRole('navigation', {
      name: 'Управление государством',
      exact: true,
    });
    await expect(citizenNav.getByRole('link', { name: 'Обзор', exact: true })).toBeVisible();
    await expect(citizenNav.getByRole('link', { name: 'Казна', exact: true })).toHaveCount(0);
    await citizen.goto(`/app/states/${first}/manage?section=treasury`);
    await expect(citizen.getByText(/Этот раздел недоступен/u)).toBeVisible();
    expect(await citizen.locator('main').textContent()).not.toContain('Governance');
    expect(errors).toStrictEqual([]);
  } finally {
    await citizenContext.close();
    await adminContext.close();
  }
});
