import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { CompanyWorkspaceSchema } from '../../apps/antares/src/modules/companies/read-contracts';

async function workspace(
  page: Page,
  id: string,
): Promise<ReturnType<typeof CompanyWorkspaceSchema.parse>> {
  const response = await page.request.get(`/api/v1/account/companies/${id}`);
  return CompanyWorkspaceSchema.parse(await response.json());
}
async function verifyCompanyModeration(admin: Page, owner: Page, companyId: string): Promise<void> {
  const before = await workspace(owner, companyId);
  await admin.goto(`/admin/companies?companyId=${companyId}&lang=en`);
  await admin.getByLabel('Reason', { exact: true }).fill('Reviewed company moderation evidence');
  await admin.getByRole('button', { name: 'Suspend company', exact: true }).click();
  await admin
    .getByRole('dialog', { name: 'Suspend company', exact: true })
    .getByRole('button', { name: 'Confirm status change', exact: true })
    .click();
  await expect
    .poll(async () => {
      const result = await workspace(owner, companyId);
      return result.status;
    })
    .toBe('SUSPENDED');
  const paused = await workspace(owner, companyId);
  expect(paused.availableActions).toEqual([]);
  expect(paused.shareholders).toEqual(before.shareholders);
  await admin.getByLabel('Reason', { exact: true }).fill('Reviewed restoration evidence');
  await admin.getByRole('button', { name: 'Restore company', exact: true }).click();
  await admin
    .getByRole('dialog', { name: 'Restore company', exact: true })
    .getByRole('button', { name: 'Confirm status change', exact: true })
    .click();
  await expect
    .poll(async () => {
      const result = await workspace(owner, companyId);
      return result.status;
    })
    .toBe('ACTIVE');
  await expect(
    admin.getByText('Reviewed company moderation evidence', { exact: true }),
  ).toBeVisible();
  await expect(admin.getByText('Reviewed restoration evidence', { exact: true })).toBeVisible();
}
export { verifyCompanyModeration };
