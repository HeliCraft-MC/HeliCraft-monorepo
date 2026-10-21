// oxlint-disable max-lines-per-function, max-statements -- The real-browser journey keeps bilateral approval, reserve publication, player fill and cancellation in one isolated database per runtime.
import { expect, test } from '@playwright/test';
import { FxBrowserObservationsSchema } from '../../apps/antares/tests/fx-browser-contracts';
import {
  fixture,
  login,
  workspace,
  stateFx,
  money,
  bankAmounts,
  playerAmounts,
  proposeTrade,
  publishOffer,
} from './fx-browser-helpers';

test('bilateral bank exchange, backed offer, player fill and cancellation preserve exact balances in the real UI', async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  const data = await fixture(page);
  const partner = await browser.newContext({ baseURL });
  const second = await partner.newPage();
  try {
    await login(page, 'FxA');
    const beforeExchange = await playerAmounts(page);
    const firstBalance = BigInt(
      beforeExchange.accounts.find((item) => item.currencyId === data.firstCurrency)
        ?.balanceMinor ?? '0',
    );
    const secondBalance = BigInt(
      beforeExchange.accounts.find((item) => item.currencyId === data.secondCurrency)
        ?.balanceMinor ?? '0',
    );
    await workspace(page, data.firstStateId);
    await proposeTrade(page, data);
    expect((await stateFx(page, data.firstStateId)).trades[0]?.status).toBe('PENDING');
    await login(second, 'FxB');
    await workspace(second, data.secondStateId);
    await second.getByRole('button', { name: 'Review and approve for our state' }).click();
    const approval = second.getByRole('dialog', { name: 'Approve these exact terms' });
    await approval.getByRole('button', { name: 'Propose our state decision' }).click();
    await expect(approval).not.toBeVisible();
    await expect
      .poll(async () => (await stateFx(page, data.firstStateId)).trades[0]?.status)
      .toBe('SETTLED');
    expect(await bankAmounts(page, data.firstStateId, data.firstCurrency)).toEqual({
      balance: '498000',
      reserved: '0',
      available: '498000',
    });
    expect(await bankAmounts(second, data.secondStateId, data.secondCurrency)).toEqual({
      balance: '499000',
      reserved: '0',
      available: '499000',
    });
    await workspace(page, data.firstStateId);
    const offerId = await publishOffer(page, data);
    expect(await bankAmounts(page, data.firstStateId, data.secondCurrency)).toEqual({
      balance: '1000',
      reserved: '500',
      available: '500',
    });
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `/tmp/fx-bank-desktop-${testInfo.project.name}.png`,
      fullPage: true,
      caret: 'initial',
    });
    const publicResponse = await page.request.get(`/exchange/${offerId}?lang=en`);
    const html = await publicResponse.text();
    expect(publicResponse.status()).toBe(200);
    expect(html).toContain('FXA');
    expect(html).toContain('FXB');
    expect(html).not.toMatch(/"(?:balanceMinor|quoteId|actorId|accounts)":/u);
    const noScript = await browser.newContext({ baseURL, javaScriptEnabled: false });
    try {
      const publicPage = await noScript.newPage();
      await publicPage.goto(`/exchange/${offerId}?lang=en`);
      await expect(
        publicPage.getByRole('heading', { name: 'Exchange terms', exact: true }),
      ).toBeVisible();
      await expect(publicPage.getByText('FXA', { exact: false }).first()).toBeVisible();
      await expect(
        publicPage.getByText('Minimum you pay', { exact: true }).locator('..'),
      ).toContainText('0.02');
      await expect(
        publicPage.getByText('Maximum you can pay now', { exact: true }).locator('..'),
      ).toContainText('10.00');
      await publicPage.goto('/exchange?lang=en');
      await publicPage.getByLabel('You pay', { exact: true }).selectOption('FXA');
      await publicPage.getByLabel('You receive', { exact: true }).selectOption('FXB');
      await publicPage.getByLabel('Bank, state or currency', { exact: true }).fill('FXA');
      await publicPage.getByRole('button', { name: 'Find offers', exact: true }).click();
      await expect(publicPage.getByRole('link', { name: 'View offer', exact: true })).toHaveCount(
        1,
      );
      await expect(publicPage.locator('head meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, nofollow',
      );
      await publicPage.getByLabel('You pay', { exact: true }).selectOption('FXB');
      await publicPage.getByRole('button', { name: 'Find offers', exact: true }).click();
      await expect(
        publicPage.getByText('There are no available offers yet.', { exact: true }),
      ).toBeVisible();
    } finally {
      await noScript.close();
    }
    await page.goto(`/app/exchange/${offerId}?lang=en`);
    await page.getByLabel('Number of lots', { exact: true }).fill('100');
    await page.getByRole('button', { name: 'Calculate exchange', exact: true }).click();
    const confirmation = page.getByRole('dialog', { name: 'Confirm exchange' });
    await expect(confirmation).toContainText('2.00');
    await expect(confirmation).toContainText('1.00');
    await confirmation.getByRole('button', { name: 'Confirm exchange', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Exchange completed', exact: true }),
    ).toBeVisible();
    expect(await bankAmounts(page, data.firstStateId, data.secondCurrency)).toEqual({
      balance: '900',
      reserved: '400',
      available: '500',
    });
    expect(await bankAmounts(page, data.firstStateId, data.firstCurrency)).toEqual({
      balance: '498200',
      reserved: '0',
      available: '498200',
    });
    const wallet = await playerAmounts(page);
    expect(
      wallet.accounts.find((item) => item.currencyId === data.firstCurrency)?.balanceMinor,
    ).toBe((firstBalance - 200n).toString());
    expect(
      wallet.accounts.find((item) => item.currencyId === data.secondCurrency)?.balanceMinor,
    ).toBe((secondBalance + 100n).toString());
    expect((await money(page, data.firstStateId)).currency?.supplyMinor).toBe('1000000');
    expect((await money(second, data.secondStateId)).currency?.supplyMinor).toBe('1000000');
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `/tmp/fx-exchange-desktop-${testInfo.project.name}.png`,
      fullPage: true,
      caret: 'initial',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `/tmp/fx-exchange-mobile-${testInfo.project.name}.png`,
      fullPage: true,
      caret: 'initial',
    });
    await workspace(page, data.firstStateId);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `/tmp/fx-bank-mobile-${testInfo.project.name}.png`,
      fullPage: true,
      caret: 'initial',
    });
    await page.getByRole('button', { name: 'Cancel offer', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Cancel this offer?' })
      .getByRole('button', { name: 'Propose cancellation' })
      .click();
    await expect
      .poll(async () => (await stateFx(page, data.firstStateId)).offers[0]?.status)
      .toBe('CANCELLED');
    expect(await bankAmounts(page, data.firstStateId, data.secondCurrency)).toEqual({
      balance: '900',
      reserved: '0',
      available: '900',
    });
    await page.goto('/app/exchange?lang=en');
    await expect(
      page.getByRole('heading', { name: 'Exchange completed', exact: true }),
    ).toHaveCount(1);
    await page.getByText('Receipt and journals', { exact: true }).click();
    await expect(page.locator('details li')).toHaveCount(2);
    const observed = FxBrowserObservationsSchema.parse(
      await (await page.request.get('/api/__e2e/fx-observed')).json(),
    );
    expect(observed.observations.length).toBeGreaterThan(0);
    expect(observed.observations.every((item) => !item.cookiePresent)).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await partner.close();
  }
});
