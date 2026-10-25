import { expect, test } from '@playwright/test';
import {
  assertWorkspaceWidths,
  assertAdjacentWorkspaceRows,
  verifyLocalizedTax,
} from './workspace-browser-helpers';
import { STATE_ID } from './workspace-state-fixture';
import { interceptWorkspace, COMPANY_ID } from './workspace-fixture';

test.beforeEach(async ({ page }) => {
  await interceptWorkspace(page);
});

test('mobile account navigation reveals sections and voting opens a focused ballot', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/votings?lang=en');
  const navigation = page.getByRole('navigation', { name: 'My account', exact: true });
  await expect(navigation).toBeHidden();
  await page.getByRole('button', { name: /My account/u }).click();
  await expect(navigation.getByRole('link', { name: 'Wallet', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /My account/u }).click();
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.evaluate(() => {
    document.documentElement.dataset.workspaceDocument = 'preserved';
  });
  await page.getByRole('link', { name: 'Open vote', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Community transport', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.dataset.workspaceDocument)).toBe(
    'preserved',
  );
  await page.getByRole('radio', { name: 'Build the port' }).check();
  await expect(page.getByRole('button', { name: 'Vote', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/workspace-ballot-${info.project.name}.png`, fullPage: true });
});

test('poll editor retains questions across formats, supports preview and closes from its header', async ({
  page,
}, info) => {
  await page.goto('/admin/votings?lang=en');
  await page.getByRole('button', { name: 'Create poll', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'New poll', exact: true });
  await editor.getByLabel('Poll title · English', { exact: true }).fill('A useful community poll');
  await editor
    .getByLabel('Question text · English', { exact: true })
    .fill('Where should we build?');
  await editor.getByLabel('Answer 1 · English', { exact: true }).fill('North');
  await editor.getByLabel('Answer 2 · English', { exact: true }).fill('South');
  await editor.getByLabel('Poll format', { exact: true }).selectOption('SURVEY');
  await editor.getByLabel('Poll format', { exact: true }).selectOption('VOTE');
  await expect(editor.getByLabel('Question text · English', { exact: true })).toHaveValue(
    'Where should we build?',
  );
  await editor.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(editor.getByLabel('Voting opens at', { exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'Continue', exact: true }).click();
  await editor.getByRole('radio', { name: 'North' }).check();
  await expect(editor.getByRole('radio', { name: 'North' })).toBeChecked();
  await page.screenshot({
    path: `/tmp/workspace-poll-desktop-${info.project.name}.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `/tmp/workspace-poll-mobile-${info.project.name}.png`,
    fullPage: true,
  });
  await editor.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(editor).toBeHidden();
});

test('company workspace keeps actions compact and mobile sections accessible', async ({
  page,
}, info) => {
  await page.goto(`/app/companies/${COMPANY_ID}?section=branches&lang=en`);
  await page.getByText('Open a branch', { exact: true }).click();
  await expect(page.getByLabel('Branch name · English', { exact: true })).toBeVisible();
  await page.getByText('Open a branch', { exact: true }).click();
  await page.screenshot({
    path: `/tmp/workspace-company-desktop-${info.project.name}.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /Company workspace sections/u }).click();
  const shell = await page.locator('main').elementHandle();
  await page.getByRole('link', { name: 'Ownership', exact: true }).click();
  expect(await shell?.evaluate((element) => element.isConnected)).toBe(true);
  await expect(page.getByRole('heading', { name: 'Ownership and shares' })).toBeVisible();
  await assertAdjacentWorkspaceRows(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `/tmp/workspace-company-mobile-${info.project.name}.png`,
    fullPage: true,
  });
});

test('state taxation uses keyboard accessible tabs and a focused law editor across screen widths', async ({
  page,
}, info) => {
  await page.goto(`/app/states/${STATE_ID}/manage?section=taxation&lang=en`);
  await expect(page.getByRole('tab', { name: 'Laws', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('tab', { name: 'Laws', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Decisions', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tab', { name: 'Decisions', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('tab', { name: 'Assessments and receipts', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Assessments and exemptions', exact: true }),
  ).toBeVisible();
  await assertWorkspaceWidths(page, [360, 390, 768, 1280]);
  await page.screenshot({
    path: `/tmp/workspace-tax-desktop-${info.project.name}.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /State management/u }).click();
  await expect(
    page
      .getByRole('navigation', { name: 'State management', exact: true })
      .getByRole('link', { name: 'Citizens', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /State management/u }).click();
  await page.getByRole('button', { name: 'New tax law', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Tax decision', exact: true });
  await expect(dialog).toBeVisible();
  await verifyLocalizedTax(dialog);
  await page.screenshot({
    path: `/tmp/workspace-tax-mobile-${info.project.name}.png`,
    fullPage: true,
  });
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'Assessments and receipts', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
});

test('institutions share a persistent state shell and keep authorized tools out of the main menu', async ({
  page,
}) => {
  await page.goto(`/app/states/${STATE_ID}/manage?section=institutions&lang=en`);
  const menu = page.getByRole('navigation', { name: 'State management', exact: true });
  await expect(menu.getByRole('link', { name: 'Institutions', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(menu.getByRole('link', { name: 'Taxation', exact: true })).toHaveCount(0);
  const shell = await page.locator('main').elementHandle();
  const tools = page.getByRole('navigation', { name: 'State institutions', exact: true });
  await tools.getByRole('link', { name: /Taxation/u }).click();
  await expect(page.getByRole('tab', { name: 'Laws', exact: true })).toBeVisible();
  expect(await shell?.evaluate((element) => element.isConnected)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('navigation', { name: 'Institution tools', exact: true }),
  ).toBeHidden();
  await page.getByRole('button', { name: /Institution tools/u }).click();
  await page.getByRole('link', { name: 'All institutions', exact: true }).click();
  await expect(
    page.getByRole('navigation', { name: 'State institutions', exact: true }),
  ).toBeVisible();
  expect(await shell?.evaluate((element) => element.isConnected)).toBe(true);
});

test('company charter editing separates offices, authority and voting without losing translated changes', async ({
  page,
}, info) => {
  await page.goto(`/app/companies/${COMPANY_ID}?section=governance&lang=en`);
  await page.getByText('Prepare charter amendment', { exact: true }).click();
  const tabs = page.getByRole('tablist', { name: 'Charter sections', exact: true });
  await page.getByLabel('Office name · English', { exact: true }).fill('Updated representative');
  await tabs.getByRole('tab', { name: 'Voting', exact: true }).click();
  await expect(
    page.getByRole('checkbox', {
      name: 'Close when the outcome can no longer change',
      exact: true,
    }),
  ).toBeChecked();
  await tabs.getByRole('tab', { name: 'Authority', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Authority policies', exact: true }).last(),
  ).toBeVisible();
  await tabs.getByRole('tab', { name: 'Offices', exact: true }).click();
  await expect(page.getByLabel('Office name · English', { exact: true })).toHaveValue(
    'Updated representative',
  );
  await assertWorkspaceWidths(page, [360, 390, 768, 1280]);
  await page.screenshot({
    path: `/tmp/ux2-company-charter-desktop-${info.project.name}.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await assertAdjacentWorkspaceRows(page);
  await expect(tabs.getByRole('tab', { name: 'Offices', exact: true })).toHaveCSS(
    'white-space',
    'nowrap',
  );
  await page.evaluate(() => {
    globalThis.scrollTo(0, 0);
  });
  await page.screenshot({
    path: `/tmp/ux2-company-charter-mobile-${info.project.name}.png`,
    fullPage: true,
  });
});
