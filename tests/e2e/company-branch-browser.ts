import { expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { BranchListSchema } from '../../apps/antares/src/modules/companies/branch-read-contracts';
import { login } from './fx-browser-helpers';

async function branches(
  page: Page,
  companyId: string,
): Promise<ReturnType<typeof BranchListSchema.parse>> {
  const response = await page.request.get(`/api/v1/account/companies/${companyId}/branches`);
  return BranchListSchema.parse(await response.json());
}
// oxlint-disable-next-line max-lines-per-function, max-statements -- The two actual state officers configure host policy, register a real branch through corporate Governance and approve its immutable host application.
async function verifyCompanyBranch(
  page: Page,
  browser: Browser,
  input: Readonly<{
    companyId: string;
    secondStateId: string;
    baseURL: string | undefined;
    project: string;
  }>,
): Promise<void> {
  const context = await browser.newContext({ baseURL: input.baseURL });
  const host = await context.newPage();
  try {
    await login(host, 'FxB');
    await host.goto(`/app/states/${input.secondStateId}/manage?section=companies&lang=en`);
    await expect(
      host.getByRole('heading', { name: 'Companies and registration', exact: true }),
    ).toBeVisible();
    await host.getByLabel('Branch registration', { exact: true }).selectOption('APPROVAL');
    await host.getByLabel('Foreign branches', { exact: true }).selectOption('ALLOW');
    await host.getByLabel('Corporate founders', { exact: true }).selectOption('ALLOW');
    await host.getByRole('button', { name: 'Review registration policy', exact: true }).click();
    await host
      .getByRole('dialog', { name: 'Review state decision', exact: true })
      .getByRole('button', { name: 'Propose state decision', exact: true })
      .click();
    await expect(
      host.getByRole('dialog', { name: 'Review state decision', exact: true }),
    ).not.toBeVisible();
    await page.goto(`/app/companies/${input.companyId}?section=branches&lang=en`);
    await page.getByLabel('Host jurisdiction', { exact: true }).selectOption(input.secondStateId);
    await page.getByLabel('Branch name · English', { exact: true }).fill('Browser foreign branch');
    await page
      .getByLabel('Branch description · English', { exact: true })
      .fill('A presence of the same legal entity with no separate account.');
    await page.getByRole('button', { name: 'Review branch registration', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Review corporate decision', exact: true })
      .getByRole('button', { name: 'Propose corporate decision', exact: true })
      .click();
    await expect
      .poll(async () => {
        const result = await branches(page, input.companyId);
        return result.items[0]?.status;
      })
      .toBe('PENDING_REGISTRATION');
    await host.reload();
    await host
      .getByLabel('Branch decision reason', { exact: true })
      .fill('Reviewed actual company and immutable host terms');
    await host.getByRole('button', { name: 'Review branch decision', exact: true }).click();
    const review = host.getByRole('dialog', { name: 'Review state decision', exact: true });
    await expect(review).toContainText('Browser foreign branch');
    await review.getByRole('button', { name: 'Propose state decision', exact: true }).click();
    await expect
      .poll(async () => {
        const result = await branches(page, input.companyId);
        return result.items[0]?.status;
      })
      .toBe('ACTIVE');
    const denied = await host.request.get(`/api/v1/account/companies/${input.companyId}/finances`);
    const NOT_FOUND = 404;
    expect(denied.status()).toBe(NOT_FOUND);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Browser foreign branch', exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `/tmp/company-branches-desktop-${input.project}.png`,
      fullPage: true,
      caret: 'initial',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `/tmp/company-branches-mobile-${input.project}.png`,
      fullPage: true,
      caret: 'initial',
    });
  } finally {
    await context.close();
  }
}
export { verifyCompanyBranch };
