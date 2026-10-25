import { openWorkspaceAction } from './workspace-browser-helpers';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { StateDetailSchema } from '../../apps/antares/src/modules/states/contracts';

async function applyManualDecision(admin: Page): Promise<void> {
  await admin.reload();
  const review = admin
    .locator('article')
    .filter({ has: admin.getByRole('heading', { name: /Назначение на должность/u }) });
  await review
    .getByLabel('Причина ручного решения', { exact: true })
    .fill('Полномочия и ручная процедура проверены');
  await review.getByRole('button', { name: 'Выполнить решение', exact: true }).click();
  await expect(review).toContainText('Решение выполнено');
}
async function captureMobileDecision(page: Page, projectName: string): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/helicraft-office-assignment-mobile-${projectName}.png`,
    fullPage: true,
  });
}
async function assertOfficeAssignmentPages(
  page: Page,
  admin: Page,
  input: Readonly<{
    stateId: string;
    founderName: string;
    successorName: string;
    projectName: string;
  }>,
): Promise<void> {
  await page.goto(`/app/states/${input.stateId}/manage?section=appointments`);
  await expect(
    page.getByRole('heading', { name: 'Назначения и снятия с должностей', exact: true }),
  ).toBeVisible();
  await openWorkspaceAction(page, 'Предложить назначение или снятие');
  await page
    .getByLabel('Игрок для решения', { exact: true })
    .selectOption({ label: input.successorName });
  await page
    .getByLabel('Кого заменить', { exact: true })
    .selectOption({ label: input.founderName });
  await page.getByRole('button', { name: 'Инициировать решение', exact: true }).click();
  const proposal = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: /Назначение на должность/u }) });
  await expect(proposal).toContainText(input.successorName);
  await expect(
    proposal.getByRole('button', { name: 'Выполнить решение', exact: true }),
  ).toBeDisabled();
  await proposal.getByRole('button', { name: /Одобрить от должности/u }).click();
  await expect(proposal).toContainText('ручную проверку');
  await captureMobileDecision(page, input.projectName);
  await applyManualDecision(admin);
  const response = await page.request.get(`/api/v1/account/states/${input.stateId}`);
  const state = StateDetailSchema.parse(await response.json());
  expect(state.holders.map((holder) => holder.name)).toEqual([input.successorName]);
  await page.reload();
  await expect(proposal).toContainText('Решение выполнено');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: `/tmp/helicraft-office-assignment-desktop-${input.projectName}.png`,
    fullPage: true,
  });
}
export { assertOfficeAssignmentPages };
