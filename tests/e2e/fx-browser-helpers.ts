import { openWorkspaceAction } from './workspace-browser-helpers';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FxBrowserFixtureSchema } from '../../apps/antares/tests/fx-browser-contracts';
import type { FxBrowserFixture } from '../../apps/antares/tests/fx-browser-contracts';
import { StateFxSchema } from '../../apps/antares/src/modules/fx/read-contracts';
import {
  StateMonetarySchema,
  WalletSchema,
} from '../../apps/antares/src/modules/monetary/contracts';

const HTTP_OK = 200;
async function fixture(page: Page): Promise<FxBrowserFixture> {
  const response = await page.request.get('/api/__e2e/fx-fixture');
  return FxBrowserFixtureSchema.parse(await response.json());
}
async function login(page: Page, suffix: string): Promise<void> {
  await page.goto('/login?lang=en');
  await page.getByLabel('Username', { exact: true }).fill(`MoneyFounder${suffix}`);
  await page.getByLabel('Password', { exact: true }).fill('A sufficiently long password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/\/app/u);
}
async function workspace(page: Page, stateId: string): Promise<void> {
  await page.goto(`/app/states/${stateId}/manage?section=fx&lang=en`);
  await expect(
    page.getByRole('heading', { name: 'Central bank currency exchange', exact: true }),
  ).toBeVisible();
  await expect(page.locator('summary').filter({ hasText: 'New interbank trade' })).toBeVisible();
}
async function stateFx(
  page: Page,
  stateId: string,
): Promise<ReturnType<typeof StateFxSchema.parse>> {
  const response = await page.request.get(`/api/v1/account/states/${stateId}/fx`);
  expect(response.status()).toBe(HTTP_OK);
  return StateFxSchema.parse(await response.json());
}
async function money(
  page: Page,
  stateId: string,
): Promise<ReturnType<typeof StateMonetarySchema.parse>> {
  const response = await page.request.get(`/api/v1/account/states/${stateId}/monetary`);
  expect(response.status()).toBe(HTTP_OK);
  return StateMonetarySchema.parse(await response.json());
}
async function bankAmounts(
  page: Page,
  stateId: string,
  currencyId: string,
): Promise<{ balance: string; reserved: string; available: string }> {
  const data = await money(page, stateId);
  const account = data.accounts.find(
    (item) => item.kind === 'CENTRAL_BANK' && item.currencyId === currencyId,
  );
  if (account === undefined) {
    throw new Error('Expected actual central bank currency account');
  }
  return {
    balance: account.balanceMinor,
    reserved: account.reservedMinor ?? '0',
    available: account.availableMinor ?? account.balanceMinor,
  };
}
async function playerAmounts(page: Page): Promise<ReturnType<typeof WalletSchema.parse>> {
  const response = await page.request.get('/api/v1/account/wallet');
  expect(response.status()).toBe(HTTP_OK);
  return WalletSchema.parse(await response.json());
}
async function proposeTrade(page: Page, data: FxBrowserFixture): Promise<void> {
  await openWorkspaceAction(page, 'New interbank trade');
  await page.getByLabel('Bank jurisdiction', { exact: true }).selectOption(data.secondStateId);
  await page.getByRole('button', { name: 'Use this bank', exact: true }).click();
  await page.getByLabel('Our bank provides', { exact: true }).selectOption(data.firstCurrency);
  await page.getByLabel('Amount provided by our bank', { exact: true }).fill('20.00');
  await page
    .getByLabel('Counterparty bank provides', { exact: true })
    .selectOption(data.secondCurrency);
  await page.getByLabel('Amount provided by counterparty', { exact: true }).fill('10.00');
  await page.getByLabel('Trade expires at (local time)', { exact: true }).fill('2030-01-01T12:00');
  await page.getByRole('button', { name: 'Review terms', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Review interbank exchange' });
  await expect(dialog).toContainText('20.00');
  await expect(dialog).toContainText('10.00');
  await dialog.getByRole('button', { name: 'Propose our state decision' }).click();
  await expect(dialog).not.toBeVisible();
  await expect
    .poll(async () => {
      const result = await stateFx(page, data.firstStateId);
      return result.trades.length;
    })
    .toBe(1);
}
async function publishOffer(page: Page, data: FxBrowserFixture): Promise<string> {
  await openWorkspaceAction(page, 'New reserved offer');
  await page.getByLabel('Bank receives', { exact: true }).selectOption(data.firstCurrency);
  await page
    .getByLabel('Bank provides from its holdings', { exact: true })
    .selectOption(data.secondCurrency);
  await page.getByLabel('Bank receives per lot', { exact: true }).fill('0.02');
  await page.getByLabel('Bank provides per lot', { exact: true }).fill('0.01');
  await page.getByLabel('Total lots', { exact: true }).fill('500');
  await page.getByLabel('Minimum lots per fill', { exact: true }).fill('1');
  await page.getByLabel('Expires at (local time)', { exact: true }).fill('2030-01-01T12:00');
  await page.getByRole('button', { name: 'Review offer', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Review terms and reserve' });
  await dialog.getByRole('button', { name: 'Propose decision', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect
    .poll(async () => {
      const result = await stateFx(page, data.firstStateId);
      return result.offers.length;
    })
    .toBe(1);
  const result = await stateFx(page, data.firstStateId);
  const [offer] = result.offers;
  if (offer === undefined) {
    throw new Error('Published offer missing');
  }
  return offer.id;
}
export {
  fixture,
  login,
  workspace,
  stateFx,
  money,
  bankAmounts,
  playerAmounts,
  proposeTrade,
  publishOffer,
};
