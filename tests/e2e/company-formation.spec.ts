// oxlint-disable max-lines-per-function, max-statements -- One isolated real-browser registration journey verifies exact shares, editable Governance, resumed consent and immutable submission in both runtimes.
import { expect, test } from '@playwright/test';
import { CompanyApplicationSchema } from '../../apps/antares/src/modules/companies/application-contracts';
import { fixture, login } from './fx-browser-helpers';
import { verifyCompanyFinance } from './company-finance-browser';
import { verifyCompanyBranch } from './company-branch-browser';
import { verifyForeignSubsidiary } from './company-subsidiary-browser';
import { verifyCompanyShares } from './company-shares-browser';
import { verifyCompanyTaxRegime } from './company-tax-browser';

test('company wizard resumes exact ownership and persisted consent before submitting the real registration', async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  const errors: string[] = [];
  page.on('response', (response) => {
    if (response.url().includes('/api/v1/public/states?') && response.status() >= 400) {
      errors.push(`State directory HTTP ${response.status()}`);
    }
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  const data = await fixture(page);
  await login(page, 'FxA');
  await page.goto('/app/companies?lang=en');
  await page.getByRole('button', { name: 'Form a company', exact: true }).click();
  await page.getByRole('link', { name: 'Open new draft', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Company formation', exact: true })).toBeVisible();
  await page.getByLabel('Company name · English', { exact: true }).fill('Browser corporate entity');
  await page
    .getByLabel('Company description · English', { exact: true })
    .fill('A legal entity with independently configured authority.');
  await page
    .getByLabel('Registration jurisdiction', { exact: true })
    .selectOption(data.firstStateId);
  await page.getByRole('button', { name: '2. Ownership', exact: true }).click();
  await page.getByLabel('Initial share issuance', { exact: true }).fill('900719925474099312345');
  await page.getByLabel('Share quantity', { exact: true }).fill('900719925474099312345');
  await page.getByRole('button', { name: '3. Governance', exact: true }).click();
  await page
    .getByLabel('Start from a preset (replaces current draft)', { exact: true })
    .selectOption('OFFICER');
  await page.getByRole('button', { name: 'Apply preset…', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Replace governance settings?', exact: true })
    .getByRole('button', { name: 'Replace settings', exact: true })
    .click();
  await expect(page.getByLabel('Office name · English', { exact: true })).toHaveValue(
    'Authorized representative',
  );
  await page.getByRole('button', { name: '4. Formal charter', exact: true }).click();
  await page
    .getByLabel('Formal charter · English', { exact: true })
    .fill('# Our charter\nAuthority follows the machine-readable charter.');
  await page.getByRole('button', { name: '5. Review and submit', exact: true }).click();
  await page.getByRole('button', { name: 'Save and review registration', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Browser corporate entity', exact: true }),
  ).toBeVisible();
  const inboxPage = await page.context().newPage();
  await inboxPage.goto('/app/notifications?lang=en');
  await expect(
    inboxPage.getByRole('heading', { name: 'Approval inbox', exact: true }),
  ).toBeVisible();
  const founderRequest = inboxPage.getByRole('link', {
    name: 'Browser corporate entity Founder consent',
    exact: true,
  });
  await expect(founderRequest).toBeVisible();
  await inboxPage.screenshot({
    path: `/tmp/company-inbox-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await founderRequest.click();
  await expect(
    inboxPage.getByRole('heading', { name: 'Company formation', exact: true }),
  ).toBeVisible();
  await expect(
    inboxPage.getByRole('button', { name: 'Consent to initial ownership', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Consent to initial ownership', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Consent to initial ownership', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Consent to initial office', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Revoke consent', exact: true })).toHaveCount(2);
  await inboxPage.goto('/app/notifications?lang=en');
  await expect(
    inboxPage
      .getByRole('region', { name: 'Formation and appointments', exact: true })
      .getByText('No pending actions.', { exact: true }),
  ).toBeVisible();
  await expect(
    inboxPage.getByRole('link', {
      name: 'Browser corporate entity Founder consent',
      exact: true,
    }),
  ).toHaveCount(0);
  await inboxPage.close();
  await page.reload();
  await page.getByRole('button', { name: 'Save and review registration', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Revoke consent', exact: true })).toHaveCount(2);
  await expect(
    page.getByRole('button', { name: 'Submit registration', exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: `/tmp/company-formation-desktop-${testInfo.project.name}.png`,
    fullPage: true,
    caret: 'initial',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `/tmp/company-formation-mobile-${testInfo.project.name}.png`,
    fullPage: true,
    caret: 'initial',
  });
  await page.getByRole('button', { name: 'Submit registration', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirm company formation', exact: true });
  await expect(dialog).toContainText('900719925474099312345');
  await dialog.getByRole('button', { name: 'Confirm and submit', exact: true }).click();
  await page
    .getByRole('link', { name: 'Registration submitted. View outcome', exact: true })
    .click();
  await expect(page.getByText('Registration approved', { exact: true })).toBeVisible();
  const applicationId = new URL(page.url()).pathname.split('/').at(-1);
  const response = await page.request.get(`/api/v1/account/company-applications/${applicationId}`);
  expect(response.status()).toBe(200);
  const application = CompanyApplicationSchema.parse(await response.json());
  expect(application.configuration.totalShares).toBe('900719925474099312345');
  expect(application.configuration.allocations[0]?.shares).toBe('900719925474099312345');
  expect(application.status).toBe('APPROVED');
  await page.getByRole('link', { name: 'Open company workspace', exact: true }).click();
  await page.getByRole('button', { name: /Company workspace sections/u }).click();
  await expect(
    page.getByRole('navigation', { name: 'Company workspace sections', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.dataset.companyNavigationProbe = 'persisted';
  });
  await page
    .getByRole('navigation', { name: 'Company workspace sections', exact: true })
    .getByRole('link', { name: 'Offices', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Offices and current appointments', exact: true }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-company-navigation-probe', 'persisted');
  await verifyCompanyFinance(page, {
    companyId: application.companyId,
    currencyId: data.firstCurrency,
    project: testInfo.project.name,
  });
  await verifyCompanyBranch(page, browser, {
    companyId: application.companyId,
    secondStateId: data.secondStateId,
    baseURL,
    project: testInfo.project.name,
  });
  await verifyForeignSubsidiary(page, browser, {
    parentId: application.companyId,
    hostStateId: data.secondStateId,
    currencyId: data.firstCurrency,
    baseURL,
    project: testInfo.project.name,
  });
  await page.goto(`/companies/${application.companyId}?lang=en`);
  await expect(
    page.getByRole('heading', { name: 'Browser corporate entity', exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('listitem')
      .filter({ hasText: '900719925474099312345 / 900719925474099312345 (100.00%)' }),
  ).toBeVisible();
  await verifyCompanyShares(page, browser, {
    issuerId: application.companyId,
    totalShares: application.configuration.totalShares,
    baseURL,
    project: testInfo.project.name,
  });
  await verifyCompanyTaxRegime(page, browser, {
    companyId: application.companyId,
    stateId: data.firstStateId,
    currencyId: data.firstCurrency,
    baseURL,
    project: testInfo.project.name,
  });
  expect(errors).toEqual([]);
});
