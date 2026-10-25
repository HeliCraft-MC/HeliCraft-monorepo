import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

async function openWorkspaceAction(page: Page, title: string): Promise<void> {
  const summary = page.locator('summary').filter({ hasText: title });
  await expect(summary).toBeVisible();
  if ((await summary.locator('..').getAttribute('open')) === null) {
    await summary.click();
  }
}
const VIEWPORT_HEIGHT = 844;
async function assertWorkspaceWidths(page: Page, widths: readonly number[]): Promise<void> {
  for (const width of widths) {
    // oxlint-disable-next-line no-await-in-loop -- Each viewport must settle on this page before layout is measured.
    await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
    // oxlint-disable-next-line no-await-in-loop -- Measure this viewport before resizing the same page.
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    expect(fits, `Viewport ${width}`).toBe(true);
  }
}

async function assertAdjacentWorkspaceRows(page: Page): Promise<void> {
  const gap = await page.locator('main').evaluate((element) => {
    const navigation = element.querySelector(':scope > aside');
    const content = element.querySelector(':scope > div');
    if (navigation === null || content === null) {
      throw new Error('Workspace shell is missing navigation or content');
    }
    return content.getBoundingClientRect().top - navigation.getBoundingClientRect().bottom;
  });
  expect(gap).toBeLessThanOrEqual(1);
}
async function verifyLocalizedTax(dialog: Locator): Promise<void> {
  expect(
    await dialog.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--workspace-accent').trim(),
    ),
  ).toBe('#3c44aa');
  await expect(dialog.locator('form form')).toHaveCount(0);
  await dialog.getByLabel('Name · English', { exact: true }).fill('Local tax');
  await dialog.getByLabel('Content language', { exact: true }).selectOption('ru');
  await dialog.getByLabel('Name · Русский', { exact: true }).fill('Местный налог');
  await dialog.getByLabel('Content language', { exact: true }).selectOption('en');
  await expect(dialog.getByLabel('Name · English', { exact: true })).toHaveValue('Local tax');
}
async function selectCompanyStage(page: Page, name: string): Promise<void> {
  const stage = page.getByRole('button', { name, exact: true });
  if (!(await stage.isVisible())) {
    await page.getByRole('button', { name: /^Company formation /u }).click();
  }
  await stage.click();
}
export {
  openWorkspaceAction,
  assertWorkspaceWidths,
  assertAdjacentWorkspaceRows,
  verifyLocalizedTax,
  selectCompanyStage,
};
