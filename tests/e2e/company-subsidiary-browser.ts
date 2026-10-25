import { openWorkspaceAction, selectCompanyStage } from './workspace-browser-helpers';
import { expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { CompanyApplicationSchema } from '../../apps/antares/src/modules/companies/application-contracts';
import { CompanyWalletSchema } from '../../apps/antares/src/modules/companies/finance';
import { PublishedCompanyProfileSchema } from '../../apps/antares/src/modules/companies/profile-contracts';
import { login } from './fx-browser-helpers';

const LAST_SEGMENT = -1;
async function wallet(
  page: Page,
  id: string,
): Promise<ReturnType<typeof CompanyWalletSchema.parse>> {
  const response = await page.request.get(`/api/v1/account/companies/${id}/finances`);
  return CompanyWalletSchema.parse(await response.json());
}
async function fundSubsidiary(
  page: Page,
  input: Readonly<{ parentId: string; childId: string; currencyId: string }>,
): Promise<void> {
  const before = await wallet(page, input.childId);
  expect(before.accounts).toEqual([]);
  await page.goto(`/app/companies/${input.parentId}?section=finance&lang=en`);
  await openWorkspaceAction(page, 'New payment');
  await page.getByLabel('Payment currency', { exact: true }).selectOption(input.currencyId);
  await page.getByLabel('Payment amount', { exact: true }).fill('0.25');
  await page.getByLabel('Recipient type', { exact: true }).selectOption('COMPANY');
  await page.getByLabel('Recipient company', { exact: true }).fill('Browser foreign subsidiary');
  await page
    .getByRole('button', { name: 'Browser foreign subsidiary · Money state', exact: true })
    .click();
  await page.getByLabel('Payment purpose', { exact: true }).fill('Independent subsidiary funding');
  await page.getByRole('button', { name: 'Calculate and review payment', exact: true }).click();
  const review = page.getByRole('dialog', { name: 'Review corporate decision', exact: true });
  await expect(review).toContainText('Browser foreign subsidiary');
  await review.getByRole('button', { name: 'Propose corporate decision', exact: true }).click();
  await expect
    .poll(async () => {
      const result = await wallet(page, input.childId);
      return result.accounts.find((account) => account.currencyId === input.currencyId)
        ?.balanceMinor;
    })
    .toBe('25');
  const parent = await wallet(page, input.parentId);
  const child = await wallet(page, input.childId);
  expect(
    parent.accounts.find((account) => account.currencyId === input.currencyId)?.balanceMinor,
  ).toBe('50');
  expect(parent.accounts[0]?.id).not.toBe(child.accounts[0]?.id);
}
// oxlint-disable-next-line max-lines-per-function, max-statements -- A foreign subsidiary is prepared in the real wizard, approved by its actual corporate founder and then registered by its host state Governance.
async function verifyForeignSubsidiary(
  page: Page,
  browser: Browser,
  input: Readonly<{
    parentId: string;
    hostStateId: string;
    currencyId: string;
    baseURL: string | undefined;
    project: string;
  }>,
): Promise<void> {
  await page.goto(`/app/companies/${input.parentId}?section=subsidiaries&lang=en`);
  await openWorkspaceAction(page, 'Found a subsidiary');
  await page.getByRole('button', { name: 'Prepare subsidiary draft', exact: true }).click();
  await page.getByRole('link', { name: 'Open subsidiary wizard', exact: true }).click();
  await page
    .getByLabel('Company name · English', { exact: true })
    .fill('Browser foreign subsidiary');
  await page
    .getByLabel('Company description · English', { exact: true })
    .fill('An independent legal entity in a foreign jurisdiction.');
  await page
    .getByLabel('Registration jurisdiction', { exact: true })
    .selectOption(input.hostStateId);
  await selectCompanyStage(page, '2. Ownership');
  await page.getByLabel('Initial share issuance', { exact: true }).fill('29');
  await page.getByLabel('Share quantity', { exact: true }).fill('29');
  await selectCompanyStage(page, '3. Governance');
  await page
    .getByLabel('Start from a preset (replaces current draft)', { exact: true })
    .selectOption('OFFICER');
  await page.getByRole('button', { name: 'Apply preset…', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Replace governance settings?', exact: true })
    .getByRole('button', { name: 'Replace settings', exact: true })
    .click();
  await selectCompanyStage(page, '5. Review and submit');
  await page.getByRole('button', { name: 'Save and review registration', exact: true }).click();
  await page.getByRole('button', { name: 'Consent to initial office', exact: true }).click();
  await page.getByRole('link', { name: 'Consent through founder Governance', exact: true }).click();
  await page.getByRole('button', { name: 'Review founding company consent', exact: true }).click();
  const corporateReview = page.getByRole('dialog', {
    name: 'Review corporate decision',
    exact: true,
  });
  await expect(corporateReview).toContainText('Browser foreign subsidiary');
  await expect(corporateReview).toContainText('29');
  await corporateReview
    .getByRole('button', { name: 'Propose corporate decision', exact: true })
    .click();
  await expect(corporateReview).not.toBeVisible();
  await page.getByRole('link', { name: 'Return to formation draft', exact: true }).click();
  await page.getByRole('button', { name: 'Save and review registration', exact: true }).click();
  await page.getByRole('button', { name: 'Submit registration', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Confirm company formation', exact: true })
    .getByRole('button', { name: 'Confirm and submit', exact: true })
    .click();
  await page
    .getByRole('link', { name: 'Registration submitted. View outcome', exact: true })
    .click();
  const applicationId = new URL(page.url()).pathname.split('/').at(LAST_SEGMENT);
  const response = await page.request.get(`/api/v1/account/company-applications/${applicationId}`);
  const application = CompanyApplicationSchema.parse(await response.json());
  expect(application.status).toBe('PENDING');
  expect(application.companyId).not.toBe(input.parentId);
  const context = await browser.newContext({ baseURL: input.baseURL });
  const host = await context.newPage();
  try {
    await login(host, 'FxB');
    await host.goto('/app/notifications?lang=en');
    await host
      .getByRole('link', {
        name: 'Browser foreign subsidiary Review registration',
        exact: true,
      })
      .click();
    await expect(
      host.getByRole('heading', { name: 'Registration review', exact: true }),
    ).toBeVisible();
    await host.screenshot({
      path: `/tmp/company-state-review-${input.project}.png`,
      fullPage: true,
    });
    await host
      .getByLabel('Decision reason', { exact: true })
      .fill('Reviewed foreign corporate founder and immutable charter');
    await host.getByRole('button', { name: 'Review application decision', exact: true }).click();
    await host
      .getByRole('dialog', { name: 'Review state decision', exact: true })
      .getByRole('button', { name: 'Propose state decision', exact: true })
      .click();
    await expect
      .poll(async () => {
        const result = await page.request.get(
          `/api/v1/account/company-applications/${applicationId}`,
        );
        return CompanyApplicationSchema.parse(await result.json()).status;
      })
      .toBe('APPROVED');
  } finally {
    await context.close();
  }
  const profileResponse = await page.request.get(
    `/api/v1/public/companies/${application.companyId}`,
  );
  const profile = PublishedCompanyProfileSchema.parse(await profileResponse.json());
  expect(profile.identity.registrationStateId).toBe(input.hostStateId);
  expect(profile.owners.items[0]).toMatchObject({
    identity: { owner: { type: 'COMPANY', id: input.parentId } },
    shares: '29',
  });
  await fundSubsidiary(page, {
    parentId: input.parentId,
    childId: application.companyId,
    currencyId: input.currencyId,
  });
  await page.goto(`/companies/${application.companyId}?lang=en`);
  await expect(
    page.getByRole('heading', { name: 'Browser foreign subsidiary', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `/tmp/company-subsidiary-mobile-${input.project}.png`,
    fullPage: true,
    caret: 'initial',
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: `/tmp/company-subsidiary-desktop-${input.project}.png`,
    fullPage: true,
    caret: 'initial',
  });
}
export { verifyForeignSubsidiary };
