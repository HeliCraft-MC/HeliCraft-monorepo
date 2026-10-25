import { openWorkspaceAction } from './workspace-browser-helpers';
import { expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { CompanyWalletSchema } from '../../apps/antares/src/modules/companies/finance';
import { CompanyDecisionDetailSchema } from '../../apps/antares/src/modules/companies/read-contracts';
import { StateTaxationSchema } from '../../apps/antares/src/modules/taxation/read-contracts';
import { StateMonetarySchema } from '../../apps/antares/src/modules/monetary/contracts';
import { verifyCompanyModeration } from './company-admin-browser';

const LAST_SEGMENT = -1;
async function confirmTaxDecision(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Submit for approval', exact: true }).click();
  const review = page.getByRole('dialog', { name: 'Confirm decision', exact: true });
  await review.getByRole('button', { name: 'Confirm decision', exact: true }).click();
  await expect(review).not.toBeVisible();
}
async function companyWallet(
  page: Page,
  id: string,
): Promise<ReturnType<typeof CompanyWalletSchema.parse>> {
  const response = await page.request.get(`/api/v1/account/companies/${id}/finances`);
  return CompanyWalletSchema.parse(await response.json());
}
async function taxation(
  page: Page,
  stateId: string,
): Promise<ReturnType<typeof StateTaxationSchema.parse>> {
  const response = await page.request.get(`/api/v1/account/states/${stateId}/taxation`);
  return StateTaxationSchema.parse(await response.json());
}
async function establishOffice(page: Page, admin: Page, stateId: string): Promise<void> {
  await page.goto(`/app/states/${stateId}/manage?section=taxation&lang=en`);
  await openWorkspaceAction(page, 'Establish a tax office');
  await page.getByLabel('Name · English', { exact: true }).fill('Corporate browser tax office');
  await page
    .getByLabel('Description · English', { exact: true })
    .fill('Official company tax administration');
  await confirmTaxDecision(page);
  await admin.goto('/login?lang=en');
  await admin.getByLabel('Username', { exact: true }).fill('MoneyReviewerFxA');
  await admin.getByLabel('Password', { exact: true }).fill('A sufficiently long password');
  await admin.getByRole('button', { name: 'Sign in', exact: true }).click();
  await admin.waitForURL(/\/app/u);
  await admin.goto('/admin/tax-offices?lang=en');
  const card = admin.getByRole('article').filter({
    has: admin.getByRole('heading', { name: 'Corporate browser tax office', exact: true }),
  });
  await card.getByLabel('Status', { exact: true }).selectOption('ACTIVE');
  await card.getByLabel('Reason', { exact: true }).fill('Reviewed actual Governance source');
  await card.getByRole('button', { name: 'Record administrative decision', exact: true }).click();
  await expect
    .poll(async () => {
      const result = await taxation(page, stateId);
      return result.office?.status;
    })
    .toBe('ACTIVE');
  await page.reload();
}
async function fillLaw(page: Page, name: string, rate: string): Promise<void> {
  await page.getByRole('button', { name: 'New tax law', exact: true }).click();
  await page.getByLabel('Name · English', { exact: true }).fill(name);
  await page
    .getByLabel('Description · English', { exact: true })
    .fill('Company registration based transfer claim');
  await page.getByLabel('Player → player', { exact: true }).uncheck();
  await page.getByLabel('Company → player', { exact: true }).check();
  await page.getByLabel('Tax jurisdiction', { exact: true }).selectOption('COMPANY_REGISTRATION');
  await page.getByLabel('Taxpayer', { exact: true }).selectOption('SENDER');
  await page.getByLabel('Tax base', { exact: true }).selectOption('EXCESS');
  await page.getByLabel('Tax-free allowance', { exact: true }).fill('0.10');
  await page.getByLabel('Tax category', { exact: true }).selectOption('CONTRIBUTION');
  await page.getByLabel('Rate, basis points', { exact: true }).fill(rate);
  await page.getByLabel('Tax recipient', { exact: true }).selectOption('STATE_TREASURY');
  await page.getByLabel('Effective date', { exact: true }).fill('2026-01-01T00:00');
}
async function companyPayment(
  page: Page,
  input: Readonly<{ companyId: string; currencyId: string; debit: string; balance: string }>,
): Promise<void> {
  await page.goto(`/app/companies/${input.companyId}?section=finance&lang=en`);
  await openWorkspaceAction(page, 'New payment');
  await page.getByLabel('Payment currency', { exact: true }).selectOption(input.currencyId);
  await page.getByLabel('Payment amount', { exact: true }).fill('0.20');
  await page.getByLabel('Find recipient', { exact: true }).fill('MoneyFounderFxB');
  await page.getByRole('button', { name: 'MoneyFounderFxB', exact: true }).click();
  await page
    .getByLabel('Payment purpose', { exact: true })
    .fill('Corporate regime browser verification');
  await page.getByRole('button', { name: 'Calculate and review payment', exact: true }).click();
  const review = page.getByRole('dialog', { name: 'Review corporate decision', exact: true });
  await expect(review).toContainText('0.20');
  await review.getByRole('button', { name: 'Propose corporate decision', exact: true }).click();
  await page
    .getByRole('link', { name: 'Decision saved. View approvals and outcome', exact: true })
    .click();
  const id = new URL(page.url()).pathname.split('/').at(LAST_SEGMENT);
  const response = await page.request.get(`/api/v1/account/company-decisions/${id}`);
  const decision = CompanyDecisionDetailSchema.parse(await response.json());
  expect(decision.status).toBe('APPLIED');
  expect(decision.calculation?.totalDebitMinor).toBe(input.debit);
  const result = await companyWallet(page, input.companyId);
  expect(
    result.accounts.find((account) => account.currencyId === input.currencyId)?.balanceMinor,
  ).toBe(input.balance);
}
// oxlint-disable-next-line max-statements, max-lines-per-function -- The state enacts an executable company law, observes its real collection, then adopts a targeted exemption through Governance and verifies a changed financial result.
async function verifyCompanyTaxRegime(
  page: Page,
  browser: Browser,
  input: Readonly<{
    companyId: string;
    stateId: string;
    currencyId: string;
    baseURL: string | undefined;
    project: string;
  }>,
): Promise<void> {
  const context = await browser.newContext({ baseURL: input.baseURL });
  const admin = await context.newPage();
  try {
    await establishOffice(page, admin, input.stateId);
    await fillLaw(page, 'Corporate browser general claim', '1000');
    await confirmTaxDecision(page);
    await expect
      .poll(async () => {
        const result = await taxation(page, input.stateId);
        return result.laws.some((law) => law.name.en === 'Corporate browser general claim');
      })
      .toBe(true);
    await companyPayment(page, {
      companyId: input.companyId,
      currencyId: input.currencyId,
      debit: '21',
      balance: '29',
    });
    await page.goto(`/app/states/${input.stateId}/manage?section=taxation&lang=en`);
    await fillLaw(page, 'Corporate browser exemption', '0');
    await page.getByLabel('Treatment', { exact: true }).selectOption('EXEMPT');
    await page.getByLabel('Company taxpayer', { exact: true }).fill('Browser corporate entity');
    await page
      .getByRole('button', { name: 'Browser corporate entity · Money state', exact: true })
      .click();
    await page
      .getByLabel('General claim to change', { exact: true })
      .selectOption({ label: 'Corporate browser general claim' });
    await page.screenshot({
      path: `/tmp/company-tax-regime-desktop-${input.project}.png`,
      fullPage: true,
      caret: 'initial',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `/tmp/company-tax-regime-mobile-${input.project}.png`,
      fullPage: true,
      caret: 'initial',
    });
    await confirmTaxDecision(page);
    await expect
      .poll(async () => {
        const result = await taxation(page, input.stateId);
        return result.laws.some((law) => law.rule.regime?.mode === 'EXEMPT');
      })
      .toBe(true);
    await companyPayment(page, {
      companyId: input.companyId,
      currencyId: input.currencyId,
      debit: '20',
      balance: '9',
    });
    const response = await page.request.get(`/api/v1/account/states/${input.stateId}/monetary`);
    const monetary = StateMonetarySchema.parse(await response.json());
    expect(
      monetary.accounts.find(
        (account) => account.kind === 'TREASURY' && account.currencyId === input.currencyId,
      )?.balanceMinor,
    ).toBe('1');
    await verifyCompanyModeration(admin, page, input.companyId);
  } finally {
    await context.close();
  }
}
export { verifyCompanyTaxRegime };
