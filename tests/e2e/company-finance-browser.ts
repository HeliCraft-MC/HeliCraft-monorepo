import { openWorkspaceAction } from './workspace-browser-helpers';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { CompanyWalletSchema } from '../../apps/antares/src/modules/companies/finance';
import { CompanyDecisionDetailSchema } from '../../apps/antares/src/modules/companies/read-contracts';

async function companyWallet(
  page: Page,
  companyId: string,
): Promise<ReturnType<typeof CompanyWalletSchema.parse>> {
  const response = await page.request.get(`/api/v1/account/companies/${companyId}/finances`);
  return CompanyWalletSchema.parse(await response.json());
}
const LAST_SEGMENT = -1;
// oxlint-disable-next-line max-lines-per-function, max-statements -- The browser moves real player funds into the company, reviews the actual corporate tax quote and executes one charter-approved payment.
async function verifyCompanyFinance(
  page: Page,
  input: Readonly<{ companyId: string; currencyId: string; project: string }>,
): Promise<void> {
  const { companyId, currencyId, project } = input;
  await page.goto('/app/wallet?lang=en');
  await page.getByLabel('Currency', { exact: true }).selectOption(currencyId);
  await page.getByLabel('Recipient type', { exact: true }).selectOption('COMPANY');
  await page.getByLabel('Recipient company', { exact: true }).fill('Browser corporate entity');
  await page
    .getByRole('button', { name: 'Browser corporate entity · Money state', exact: true })
    .click();
  await page.getByLabel('Amount', { exact: true }).fill('1.00');
  await page.getByLabel('Payment purpose', { exact: true }).fill('Actual company funding');
  await page.getByRole('button', { name: 'Transfer', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Confirm transfer', exact: true })
    .getByRole('button', { name: 'Confirm transfer', exact: true })
    .click();
  await expect
    .poll(async () => {
      const wallet = await companyWallet(page, companyId);
      return wallet.accounts.find((item) => item.currencyId === currencyId)?.balanceMinor;
    })
    .toBe('100');
  await page.goto(`/app/companies/${companyId}?section=finance&lang=en`);
  await openWorkspaceAction(page, 'New payment');
  await page.getByLabel('Payment currency', { exact: true }).selectOption(currencyId);
  await page.getByLabel('Payment amount', { exact: true }).fill('0.25');
  await page.getByLabel('Find recipient', { exact: true }).fill('MoneyFounderFxB');
  await page.getByRole('button', { name: 'MoneyFounderFxB', exact: true }).click();
  await page.getByLabel('Payment purpose', { exact: true }).fill('Authorized company payment');
  await page.getByRole('button', { name: 'Calculate and review payment', exact: true }).click();
  const review = page.getByRole('dialog', { name: 'Review corporate decision', exact: true });
  await expect(review).toContainText('0.25');
  await expect(review).toContainText('No applicable taxes.');
  await review.getByRole('button', { name: 'Propose corporate decision', exact: true }).click();
  await page
    .getByRole('link', { name: 'Decision saved. View approvals and outcome', exact: true })
    .click();
  await expect(page.getByText('Executed', { exact: true }).first()).toBeVisible();
  const decisionId = new URL(page.url()).pathname.split('/').at(LAST_SEGMENT);
  const response = await page.request.get(`/api/v1/account/company-decisions/${decisionId}`);
  const decision = CompanyDecisionDetailSchema.parse(await response.json());
  expect(decision.status).toBe('APPLIED');
  expect(decision.calculation?.totalDebitMinor).toBe('25');
  await expect
    .poll(async () => {
      const wallet = await companyWallet(page, companyId);
      return wallet.accounts.find((item) => item.currencyId === currencyId)?.balanceMinor;
    })
    .toBe('75');
  await page.goto(`/app/companies/${companyId}?section=finance&lang=en`);
  await expect(page.getByRole('heading', { name: 'Company finances', exact: true })).toBeVisible();
  await page.screenshot({
    path: `/tmp/company-finance-mobile-${project}.png`,
    fullPage: true,
    caret: 'initial',
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: `/tmp/company-finance-desktop-${project}.png`,
    fullPage: true,
    caret: 'initial',
  });
}
export { verifyCompanyFinance };
