// oxlint-disable max-lines, max-lines-per-function, max-statements -- Real browser lifecycle covers the monetary system without Minecraft or mock financial endpoints.
import { openWorkspaceAction } from './workspace-browser-helpers';
import { assertOfficeAssignmentPages } from './office-assignments';
import { expect } from '@playwright/test';
import { test } from './fixtures';
import type { APIRequestContext, Page } from '@playwright/test';
import { DraftSchema, StateDetailSchema } from '../../apps/antares/src/modules/states/contracts';
import { applyPreset } from '../../apps/antares/src/modules/states/presets';
import { ACTIONS } from '../../apps/antares/src/modules/monetary/domain';
import {
  StateMonetarySchema,
  WalletSchema,
} from '../../apps/antares/src/modules/monetary/contracts';

const PASSWORD = 'Browser test password 2026';
function objectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function stringField(value: unknown, key: string): string {
  if (!objectValue(value) || typeof value[key] !== 'string') {
    throw new Error('Missing response field');
  }
  return value[key];
}
// oxlint-disable-next-line max-params -- Browser helper keeps the request context, path, exact body and CSRF origin explicit.
async function post(
  request: APIRequestContext,
  path: string,
  data: unknown,
  origin: string,
): Promise<unknown> {
  const response = await request.post(`/api/v1${path}`, { data, headers: { Origin: origin } });
  expect(response.ok(), await response.text()).toBe(true);
  return await response.json();
}
async function submitDirective(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Подать на утверждение', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Подтвердить распоряжение' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Подтвердить распоряжение', exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
async function assertWalletStates(page: Page): Promise<void> {
  const gate = {
    resume: (): void => {
      throw new Error('Wallet route gate not initialized');
    },
  };
  // oxlint-disable-next-line promise/avoid-new -- Hold the HTTP response until the real loading state has been observed.
  const pending = new Promise<void>((resolve) => {
    gate.resume = resolve;
  });
  await page.route('**/api/v1/account/wallet?*', async (route) => {
    await pending;
    await route.continue();
  });
  await page.goto('/app/wallet');
  await expect(
    page
      .getByRole('main')
      .getByRole('status')
      .filter({ hasText: /^Загрузка денежных данных…$/u }),
  ).toBeVisible();
  gate.resume();
  await expect(page.getByText('В кошельке пока нет валют.', { exact: false })).toBeVisible();
  await page.unroute('**/api/v1/account/wallet?*');
  await page.route('**/api/v1/account/wallet?*', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Тестовая временная недоступность кошелька' }),
    });
  });
  await page.reload();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Тестовая временная недоступность кошелька' }),
  ).toBeVisible({ timeout: 15_000 });
  await page.unroute('**/api/v1/account/wallet?*');
}
test('operates a national monetary system through the web and renders public currency HTML', async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const origin = testInfo.project.use.baseURL;
  if (origin === undefined || origin === '') {
    throw new Error('Missing browser origin');
  }
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 8);
  const founderName = `m${suffix}`;
  const recipientName = `r${suffix}`;
  const code = `M${suffix.toUpperCase()}`;
  const adminContext = await browser.newContext({ baseURL: origin });
  const recipientContext = await browser.newContext({ baseURL: origin });
  let cleanupStateId: string | null = null;
  try {
    await post(
      recipientContext.request,
      '/auth/register',
      { username: recipientName, password: PASSWORD },
      origin,
    );
    const recipientProfile = await recipientContext.request.get('/api/v1/auth/me');
    const recipientId = stringField(await recipientProfile.json(), 'id');
    await post(
      page.request,
      '/auth/register',
      { username: founderName, password: PASSWORD },
      origin,
    );
    const profile = await page.request.get('/api/v1/auth/me');
    const founderId = stringField(await profile.json(), 'id');
    await post(
      adminContext.request,
      '/auth/login',
      { username: 'E2eOwner', password: PASSWORD },
      origin,
    );
    const draft = DraftSchema.parse(
      await post(page.request, '/account/state-drafts', { title: code }, origin),
    );
    const governance = applyPreset('AUTOCRACY', founderId);
    const response = await page.request.put(`/api/v1/account/state-drafts/${draft.id}`, {
      headers: { Origin: origin },
      data: {
        version: 1,
        title: code,
        step: 1,
        configuration: {
          ...draft.configuration,
          name: { ru: `Государство ${code}`, en: `State ${code}` },
          slug: `money-${suffix}`,
          cofounderIds: [recipientId],
          governance,
        },
      },
    });
    expect(response.ok()).toBe(true);
    const stateId = stringField(
      await post(page.request, `/account/state-drafts/${draft.id}/submit`, { version: 2 }, origin),
      'stateId',
    );
    cleanupStateId = stateId;
    await post(
      adminContext.request,
      `/admin/states/${stateId}/status`,
      { status: 'ACTIVE', reason: 'Browser state reviewed' },
      origin,
    );
    // Add optional monetary policies by the real immutable reform flow; presets never grant them.
    const reform = {
      draftId: stringField(
        await post(page.request, `/account/states/${stateId}/drafts`, {}, origin),
        'draftId',
      ),
    };
    const reformResponse = await page.request.get(`/api/v1/account/state-drafts/${reform.draftId}`);
    const reformDraft = DraftSchema.parse(await reformResponse.json());
    const [office] = governance.offices;
    if (!office) {
      throw new Error('Missing office');
    }
    const policies = Object.values(ACTIONS).map((action) => ({
      action,
      mechanism: 'SINGLE_OFFICE' as const,
      officeIds: [office.id],
      vote: null,
      manualProcedure: {},
    }));
    const saved = await page.request.put(`/api/v1/account/state-drafts/${reform.draftId}`, {
      headers: { Origin: origin },
      data: {
        version: 1,
        title: code,
        step: 1,
        configuration: {
          ...reformDraft.configuration,
          governance: {
            ...reformDraft.configuration.governance,
            policies: [...reformDraft.configuration.governance.policies, ...policies],
          },
        },
      },
    });
    expect(saved.ok()).toBe(true);
    await post(
      page.request,
      `/account/state-drafts/${reform.draftId}/propose`,
      { version: 2 },
      origin,
    );
    await post(
      page.request,
      `/account/state-drafts/${reform.draftId}/approve-office`,
      { ownerId: founderId, version: 2, officeId: office.id },
      origin,
    );
    await post(
      page.request,
      `/account/state-drafts/${reform.draftId}/publish`,
      { version: 2 },
      origin,
    );
    await assertWalletStates(page);
    const workspace = `/app/states/${stateId}/manage?section=bank`;
    await page.goto(workspace);
    await expect(
      page.getByText('Центральный банк ещё не учреждён.', { exact: false }),
    ).toBeVisible();
    await openWorkspaceAction(page, 'Новое государственное решение');
    await page.getByLabel('Название · Русский', { exact: true }).fill(`Центральный банк ${code}`);
    await page.getByLabel('Язык содержимого', { exact: true }).selectOption('en');
    await page
      .getByLabel('Название · English', { exact: true })
      .fill(`Central bank ${code} for national finance and public monetary policy`);
    await page.getByLabel('Язык содержимого', { exact: true }).selectOption('ru');
    await page
      .getByLabel('Описание и устав · Русский', { exact: true })
      .fill('Устав веб-института');
    await submitDirective(page);
    const bankHelp = page.getByRole('button', { name: 'ⓘ Центральный банк', exact: true }).first();
    await bankHelp.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toContainText('Казна получает их отдельным переводом');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Ожидает одобрения', { exact: true }).first()).toBeVisible();
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/admin/central-banks');
    const bankCard = adminPage
      .getByRole('heading', { name: `Центральный банк ${code}`, exact: true })
      .locator('xpath=..');
    await bankCard.getByLabel('Статус', { exact: true }).selectOption('ACTIVE');
    await bankCard.getByLabel('Обоснование', { exact: true }).fill('Веб-институт одобрен');
    await adminPage.evaluate(() => {
      globalThis.scrollTo(0, 0);
    });
    await adminPage.screenshot({
      path: `/tmp/monetary-admin-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await bankCard.getByRole('button', { name: 'Принять административное решение' }).click();
    await expect(bankCard).not.toBeVisible();
    await page.reload();
    await openWorkspaceAction(page, 'Новое государственное решение');
    await page.getByLabel('Действие', { exact: true }).selectOption('CREATE_CURRENCY');
    await page
      .getByLabel('Название · Русский', { exact: true })
      .fill(`Национальная валюта ${code}`);
    await page.getByLabel('Код валюты', { exact: true }).fill(code);
    await submitDirective(page);
    await openWorkspaceAction(page, 'Новое государственное решение');
    await page.getByLabel('Действие', { exact: true }).selectOption('CHANGE_POLICY');
    await page.getByLabel('Максимальная денежная масса', { exact: true }).selectOption('LIMITED');
    await page
      .getByLabel('Значение лимита: Максимальная денежная масса', { exact: true })
      .fill('9999999999999999999999999999.99');
    await page.getByLabel('Валовая эмиссия за 30 суток', { exact: true }).selectOption('LIMITED');
    await page
      .getByLabel('Значение лимита: Валовая эмиссия за 30 суток', { exact: true })
      .fill('500000.00');
    await page
      .getByLabel('Максимальная сумма одной эмиссии', { exact: true })
      .selectOption('UNLIMITED');
    await page.evaluate(() => {
      globalThis.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `/tmp/monetary-policy-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await submitDirective(page);
    await openWorkspaceAction(page, 'Новое государственное решение');
    await page.getByLabel('Действие', { exact: true }).selectOption('ISSUE');
    await page.getByLabel('Сумма', { exact: true }).fill('10000.00');
    await page.getByLabel('Назначение платежа', { exact: true }).fill('Первая эмиссия');
    await submitDirective(page);
    await expect(page.getByRole('status').filter({ hasText: 'Номер операции' })).toContainText(
      'Исполнено',
    );
    await page.goto(`/app/states/${stateId}/manage?section=monetary-policy`);
    await expect(
      page.getByRole('heading', { name: 'История денежной политики', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Редакция денежной политики № 1', exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'ⓘ Выпущено за последние 30 суток', exact: true }).first(),
    ).toBeVisible();
    await page.screenshot({
      path: `/tmp/monetary-statistics-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await page.goto(workspace);
    await openWorkspaceAction(page, 'Новое государственное решение');
    await page.getByLabel('Действие', { exact: true }).selectOption('BANK_TRANSFER');
    await page.getByLabel('Сумма', { exact: true }).fill('4000.00');
    await page.getByLabel('Получатель', { exact: true }).first().selectOption('TREASURY');
    await submitDirective(page);
    await openWorkspaceAction(page, 'Новое государственное решение');
    await page.getByLabel('Действие', { exact: true }).selectOption('TREASURY_TRANSFER');
    await page.getByLabel('Сумма', { exact: true }).fill('2000.00');
    await page.getByLabel('Получатель', { exact: true }).last().fill(founderName);
    await page.getByRole('button', { name: founderName, exact: true }).click();
    await submitDirective(page);
    await page.evaluate(() => {
      globalThis.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `/tmp/monetary-state-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await page.goto('/app/wallet');
    await page.getByLabel('Валюта', { exact: true }).selectOption({ label: code });
    await page.getByLabel('Получатель', { exact: true }).fill(recipientName);
    await page.getByRole('button', { name: recipientName, exact: true }).click();
    await page.getByLabel('Сумма', { exact: true }).fill('123.45');
    await page.getByLabel('Назначение платежа', { exact: true }).fill('Частный платёж');
    await page.getByRole('button', { name: 'Перевести', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Подтвердить перевод', exact: true })
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Перевод выполнен' })).toContainText(
      'Номер операции',
    );
    const walletResponse = await recipientContext.request.get('/api/v1/account/wallet');
    const wallet = WalletSchema.parse(await walletResponse.json());
    expect(wallet.accounts[0]?.balanceMinor).toBe('12345');
    await page.evaluate(() => {
      globalThis.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `/tmp/monetary-wallet-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.evaluate(() => {
      globalThis.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `/tmp/monetary-wallet-mobile-${testInfo.project.name}.png`,
      fullPage: true,
    });
    const publicResponse = await page.request.get(`/currencies/${code}?lang=en`);
    const html = await publicResponse.text();
    expect(html).toContain(code);
    expect(html).toContain('10,000.00');
    expect(html).not.toContain('Частный платёж');
    const noJs = await browser.newContext({ javaScriptEnabled: false, baseURL: origin });
    const publicPage = await noJs.newPage();
    await publicPage.goto(`/currencies/${code}?lang=en`);
    await expect(publicPage.getByRole('heading', { level: 1 })).toContainText(code);
    await publicPage.screenshot({
      path: `/tmp/monetary-public-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await publicPage.setViewportSize({ width: 390, height: 844 });
    expect(
      await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await publicPage.screenshot({
      path: `/tmp/monetary-public-mobile-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await noJs.close();
    const stateResponse = await page.request.get(`/api/v1/account/states/${stateId}/monetary`);
    const monetary = StateMonetarySchema.parse(await stateResponse.json());
    expect(monetary.currency?.supplyMinor).toBe('1000000');
    expect(monetary.accounts.find((account) => account.kind === 'CENTRAL_BANK')?.balanceMinor).toBe(
      '600000',
    );
    expect(monetary.accounts.find((account) => account.kind === 'TREASURY')?.balanceMinor).toBe(
      '200000',
    );
    const stateDetail = await page.request.get(`/api/v1/account/states/${stateId}`);
    expect(StateDetailSchema.parse(await stateDetail.json()).governanceRevision).toBe(2);
    await adminPage.goto(`/admin/states/${stateId}`);
    await page.goto(`/app/states/${stateId}/manage?section=appointments&lang=ru`);
    await assertOfficeAssignmentPages(page, adminPage, {
      stateId,
      founderName,
      successorName: recipientName,
      projectName: `monetary-${testInfo.project.name}`,
    });
    const forbiddenIssue = await page.request.post(
      `/api/v1/account/states/${stateId}/monetary/directives`,
      {
        headers: { Origin: origin },
        data: {
          idempotencyKey: crypto.randomUUID(),
          payload: {
            kind: 'ISSUE',
            currencyId: monetary.currency?.id,
            amountMinor: '1',
            purpose: 'Former holder must be denied',
          },
        },
      },
    );
    expect(forbiddenIssue.status()).toBe(403);
    await page.goto(`/app/states/${stateId}/manage?section=issuance`);
    await expect(
      page.getByText(
        'Этот раздел недоступен с вашими текущими полномочиями. Выберите доступный раздел в меню.',
        { exact: true },
      ),
    ).toBeVisible();
    const successorPage = await recipientContext.newPage();
    await successorPage.goto(`/app/states/${stateId}/manage?section=issuance`);
    await openWorkspaceAction(successorPage, 'Новое государственное решение');
    await expect(successorPage.getByLabel('Действие', { exact: true })).toHaveValue('ISSUE');
    await successorPage.close();
  } finally {
    if (cleanupStateId !== null) {
      const cleanupState = await adminContext.request.get(`/api/v1/admin/states/${cleanupStateId}`);
      if (StateDetailSchema.parse(await cleanupState.json()).status === 'ACTIVE') {
        await post(
          adminContext.request,
          `/admin/states/${cleanupStateId}/status`,
          {
            status: 'SUSPENDED',
            reason:
              'Monetary browser fixture completed; preserve ledger without changing homepage rankings',
          },
          origin,
        );
      }
    }
    await adminContext.close();
    await recipientContext.close();
  }
});
