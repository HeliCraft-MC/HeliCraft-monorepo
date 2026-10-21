import { expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import {
  ShareOperationViewSchema,
  SharePortfolioSchema,
} from '../../apps/antares/src/modules/companies/share-read-contracts';
import { CompanyWalletSchema } from '../../apps/antares/src/modules/companies/finance';
import { login } from './fx-browser-helpers';

const LAST_SEGMENT = -1;
async function wallet(
  page: Page,
  id: string,
): Promise<ReturnType<typeof CompanyWalletSchema.parse>> {
  const response = await page.request.get(`/api/v1/account/companies/${id}/finances`);
  return CompanyWalletSchema.parse(await response.json());
}
async function operation(
  page: Page,
  id: string,
): Promise<ReturnType<typeof ShareOperationViewSchema.parse>> {
  const response = await page.request.get(`/api/v1/account/share-operations/${id}`);
  return ShareOperationViewSchema.parse(await response.json());
}
async function prepareTerms(page: Page): Promise<string> {
  await page
    .getByRole('dialog', { name: 'Review exact share terms', exact: true })
    .getByRole('button', { name: 'Prepare immutable proposal', exact: true })
    .click();
  await page
    .getByRole('link', { name: 'Share proposal saved. View consent and execution', exact: true })
    .click();
  const id = new URL(page.url()).pathname.split('/').at(LAST_SEGMENT);
  if (id === undefined) {
    throw new Error('Share operation URL missing');
  }
  return id;
}
async function consent(page: Page, id: string): Promise<void> {
  await page.goto(`/app/share-operations/${id}?lang=en`);
  await page.getByRole('button', { name: 'Consent to receive these shares', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Consent to receive these shares', exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Consent to receive these shares', exact: true }),
  ).toBeDisabled();
}
async function personalPosition(page: Page, issuerId: string): Promise<string | undefined> {
  const response = await page.request.get('/api/v1/account/shares');
  return SharePortfolioSchema.parse(await response.json()).items.find(
    (position) => position.issuerId === issuerId,
  )?.shares;
}
// oxlint-disable-next-line max-statements -- Both players review exact share terms; the recipient's stored consent is revoked and replaced before the real owner executes a balanced transfer.
async function transferShares(page: Page, recipient: Page, issuerId: string): Promise<string> {
  await page.goto('/app/shares?lang=en');
  await page.getByText('Transfer shares', { exact: true }).click();
  await page.getByLabel('Find recipient', { exact: true }).fill('MoneyFounderFxB');
  await page.getByRole('button', { name: 'MoneyFounderFxB', exact: true }).click();
  await page.getByLabel('Shares to transfer', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Review share transfer', exact: true }).click();
  const id = await prepareTerms(page);
  await expect(
    page.getByRole('button', { name: 'Review transfer execution', exact: true }),
  ).toBeDisabled();
  await consent(recipient, id);
  await recipient
    .getByRole('button', { name: 'Revoke all my consents to these terms', exact: true })
    .click();
  await expect(
    recipient.getByRole('button', { name: 'Consent to receive these shares', exact: true }),
  ).toBeEnabled();
  await consent(recipient, id);
  await page.getByRole('button', { name: 'Refresh consent and outcome', exact: true }).click();
  await page.getByRole('button', { name: 'Review transfer execution', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Confirm share transfer', exact: true })
    .getByRole('button', { name: 'Execute share transfer', exact: true })
    .click();
  await expect
    .poll(async () => {
      const view = await operation(page, id);
      return view.eventId !== null;
    })
    .toBe(true);
  expect(await personalPosition(recipient, issuerId)).toBe('1');
  const denied = await recipient.request.get(`/api/v1/account/companies/${issuerId}/finances`);
  const NOT_FOUND = 404;
  expect(denied.status()).toBe(NOT_FOUND);
  return id;
}
async function issueShares(page: Page, recipient: Page, issuerId: string): Promise<string> {
  await page.goto(`/app/companies/${issuerId}?section=ownership&lang=en`);
  await page.getByText('Prepare additional share issuance', { exact: true }).click();
  await page.getByLabel('Additional share issuance', { exact: true }).fill('9');
  await page.getByLabel('Find owner', { exact: true }).fill('MoneyFounderFxB');
  await page.getByRole('button', { name: 'MoneyFounderFxB', exact: true }).click();
  await page.getByLabel('New owner shares', { exact: true }).fill('9');
  await page.getByRole('button', { name: 'Add owner', exact: true }).click();
  await page.getByRole('button', { name: 'Review issuance proposal', exact: true }).click();
  const id = await prepareTerms(page);
  await consent(recipient, id);
  await page
    .getByRole('link', { name: 'Issuer review of issuance or transfer approval', exact: true })
    .click();
  await page.getByRole('button', { name: 'Review share issuance decision', exact: true }).click();
  const review = page.getByRole('dialog', { name: 'Review corporate decision', exact: true });
  await expect(review).toContainText('9');
  await review.getByRole('button', { name: 'Propose corporate decision', exact: true }).click();
  await expect
    .poll(async () => {
      const view = await operation(page, id);
      return view.eventId !== null;
    })
    .toBe(true);
  return id;
}
// oxlint-disable-next-line max-lines-per-function -- Real stock changes are reconciled against both personal portfolios, the issuer's exact capital and unchanged official money.
async function verifyCompanyShares(
  page: Page,
  browser: Browser,
  input: Readonly<{
    issuerId: string;
    totalShares: string;
    baseURL: string | undefined;
    project: string;
  }>,
): Promise<void> {
  const before = await wallet(page, input.issuerId);
  const context = await browser.newContext({ baseURL: input.baseURL });
  const recipient = await context.newPage();
  try {
    await login(recipient, 'FxB');
    await transferShares(page, recipient, input.issuerId);
    const issueId = await issueShares(page, recipient, input.issuerId);
    expect(await personalPosition(recipient, input.issuerId)).toBe('10');
    expect(await personalPosition(page, input.issuerId)).toBe(
      (BigInt(input.totalShares) - 1n).toString(),
    );
    const after = await wallet(page, input.issuerId);
    expect(after.accounts).toEqual(before.accounts);
    const portfolioResponse = await page.request.get('/api/v1/account/shares');
    expect(
      SharePortfolioSchema.parse(await portfolioResponse.json()).items.find(
        (item) => item.issuerId === input.issuerId,
      )?.issuedShares,
    ).toBe((BigInt(input.totalShares) + 9n).toString());
    await page.goto(`/app/share-operations/${issueId}?lang=en`);
    await expect(
      page.getByText('Share operation completed. Ownership and its journal changed atomically.', {
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `/tmp/company-shares-desktop-${input.project}.png`,
      fullPage: true,
      caret: 'initial',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `/tmp/company-shares-mobile-${input.project}.png`,
      fullPage: true,
      caret: 'initial',
    });
  } finally {
    await context.close();
  }
}
export { verifyCompanyShares };
