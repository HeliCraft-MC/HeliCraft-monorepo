// oxlint-disable max-lines, max-lines-per-function, max-statements -- Real-browser two-state lifecycle verifies the complete tax/treaty result and historical receipts.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { StateTaxationSchema } from '../../apps/antares/src/modules/taxation/read-contracts';
import { WalletSchema } from '../../apps/antares/src/modules/monetary/contracts';
import { post, register, createTaxState, fundTaxWallet, PASSWORD } from './taxation-fixture';

async function confirmDecision(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Подать на утверждение', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Подтвердить решение', exact: true });
  await dialog.getByRole('button', { name: 'Подтвердить решение', exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
async function establishOffice(
  page: Page,
  adminPage: Page,
  input: Readonly<{ stateId: string; name: string }>,
): Promise<void> {
  await page.goto(`/app/states/${input.stateId}/manage?section=taxation`);
  await page.getByLabel('Название · Русский', { exact: true }).fill(input.name);
  await page
    .getByLabel('Описание · Русский', { exact: true })
    .fill('Налоговая служба для государственных законов и прозрачного учёта');
  await confirmDecision(page);
  await adminPage.goto('/admin/tax-offices');
  const card = adminPage
    .getByRole('heading', { name: input.name, exact: true })
    .locator('xpath=..');
  await card.getByLabel('Статус', { exact: true }).selectOption('ACTIVE');
  await card
    .getByLabel('Обоснование', { exact: true })
    .fill('Веб-институт одобрен; физическое здание не проверено');
  await card.getByRole('button', { name: 'Принять административное решение', exact: true }).click();
  await expect(card.getByText('Активен', { exact: true }).first()).toBeVisible();
  await page.reload();
}
async function enactLaw(page: Page, input: Readonly<{ name: string; bps: string }>): Promise<void> {
  await page.getByRole('button', { name: 'Новый налоговый закон', exact: true }).click();
  await page.getByLabel('Название · Русский', { exact: true }).fill(input.name);
  await page
    .getByLabel('Описание · Русский', { exact: true })
    .fill('Налог с исходной суммы личного перевода');
  await page.getByLabel('Налоговая юрисдикция', { exact: true }).selectOption('BOTH');
  await page.getByLabel('Ставка, базисные пункты', { exact: true }).fill(input.bps);
  await page.getByLabel('Дата вступления в силу', { exact: true }).fill('2026-01-01T00:00');
  await page.getByRole('button', { name: 'Рассчитать пример', exact: true }).click();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    globalThis.scrollTo(0, 0);
  });
  await page.screenshot({
    path: `/tmp/tax-law-editor-${test.info().project.name}-${input.bps}.png`,
    fullPage: true,
  });
  await expect(page.getByText('Получателю:', { exact: false }).first()).toBeVisible();
  await confirmDecision(page);
  await expect(page.getByRole('heading', { name: input.name, exact: false }).first()).toBeVisible();
}
async function transfer(
  page: Page,
  input: Readonly<{ code: string; recipient: string; expected: string }>,
): Promise<void> {
  await page.goto('/app/wallet');
  await page.getByLabel('Валюта', { exact: true }).selectOption({ label: input.code });
  await page.getByLabel('Получатель', { exact: true }).fill(input.recipient);
  await page.getByRole('button', { name: input.recipient, exact: true }).click();
  await page.getByLabel('Сумма', { exact: true }).fill('100.00');
  await page.getByLabel('Назначение платежа', { exact: true }).fill('Приватный перевод с налогами');
  await page.getByRole('button', { name: 'Перевести', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(input.expected);
  await expect(dialog).toContainText('Фактическое местоположение игрока не проверяется');
  await dialog.screenshot({
    path: `/tmp/tax-quote-${test.info().project.name}-${input.expected.replace(',', '-')}.png`,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await dialog.screenshot({
    path: `/tmp/tax-quote-mobile-${test.info().project.name}-${input.expected.replace(',', '-')}.png`,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await dialog.getByRole('button', { name: 'Подтвердить перевод', exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
test('taxes a dual citizen, ratifies a shared treaty independently, and renders public policy without JavaScript', async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const origin = testInfo.project.use.baseURL;
  if (origin === undefined) {
    throw new Error('Origin missing');
  }
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 7);
  const code = `T${suffix.toUpperCase()}`;
  const admin = await browser.newContext({ baseURL: origin });
  const partner = await browser.newContext({ baseURL: origin });
  const recipient = await browser.newContext({ baseURL: origin });
  const ids: string[] = [];
  try {
    await page.goto('/');
    await post(admin.request, '/auth/login', {
      origin,
      data: { username: 'E2eOwner', password: PASSWORD },
    });
    const payerId = await register(page.request, origin, `t${suffix}`);
    const partnerId = await register(partner.request, origin, `u${suffix}`);
    const recipientName = `v${suffix}`;
    const recipientId = await register(recipient.request, origin, recipientName);
    const firstId = await createTaxState(page.request, {
      origin,
      founderId: payerId,
      cofounderId: recipientId,
      slug: `tax-a-${suffix}`,
      name: `Аврора ${suffix}`,
    });
    const secondId = await createTaxState(partner.request, {
      origin,
      founderId: partnerId,
      cofounderId: payerId,
      slug: `tax-b-${suffix}`,
      name: `Лория ${suffix}`,
    });
    ids.push(firstId, secondId);
    for (const stateId of ids) {
      // oxlint-disable-next-line no-await-in-loop -- Real administrative reviews occur in the same persistent scenario.
      await post(admin.request, `/admin/states/${stateId}/status`, {
        origin,
        data: { status: 'ACTIVE', reason: 'Tax browser fixture reviewed' },
      });
    }
    const adminPage = await admin.newPage();
    const partnerPage = await partner.newPage();
    await establishOffice(page, adminPage, {
      stateId: firstId,
      name: `Налоговая Авроры ${suffix} — служба государственных финансов и прозрачного налогообложения`,
    });
    await enactLaw(page, { name: `Налог Авроры ${suffix}`, bps: '500' });
    await establishOffice(partnerPage, adminPage, {
      stateId: secondId,
      name: `Налоговая Лории ${suffix}`,
    });
    await enactLaw(partnerPage, { name: `Налог Лории ${suffix}`, bps: '300' });
    const currencyId = await fundTaxWallet(page.request, {
      origin,
      stateId: firstId,
      founderId: payerId,
      code,
      admin: admin.request,
    });
    await transfer(page, { code, recipient: recipientName, expected: '108,00' });
    await page.goto(`/app/states/${firstId}/manage?section=diplomacy`);
    await page.getByLabel('Найти государство', { exact: true }).fill(`Лория ${suffix}`);
    await page.getByLabel('Партнёр', { exact: true }).selectOption(secondId);
    await page.getByRole('button', { name: 'Далее', exact: true }).click();
    await page
      .getByLabel('Название договора · Русский', { exact: true })
      .fill(`Общий налоговый договор ${suffix}`);
    await page
      .getByLabel('Описание договора · Русский', { exact: true })
      .fill('Одна ставка 6% с распределением 50/50');
    await page.getByRole('button', { name: 'Далее', exact: true }).click();
    await page.getByLabel('Налоговый механизм', { exact: true }).selectOption('SHARED');
    await page.getByLabel('Дата вступления в силу', { exact: true }).fill('2026-01-01T00:00');
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      globalThis.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `/tmp/tax-treaty-terms-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      globalThis.scrollTo(0, 0);
    });
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      globalThis.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `/tmp/tax-treaty-terms-mobile-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'Далее', exact: true }).click();
    await page.getByRole('button', { name: 'Сохранить проект', exact: true }).click();
    const treatyCard = page
      .getByRole('heading', { name: `Общий налоговый договор ${suffix} · № 1`, exact: true })
      .locator('xpath=..');
    await treatyCard.getByRole('button', { name: 'Отправить партнёру', exact: true }).click();
    await treatyCard.getByRole('button', { name: 'Утвердить своей стороной', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Подтвердить государственное решение', exact: true })
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await treatyCard.getByText('Все редакции и история решений', { exact: true }).click();
    await expect(
      treatyCard.getByRole('heading', { name: 'Редакция № 1', exact: false }).first(),
    ).toBeVisible();
    await treatyCard.getByText('Все редакции и история решений', { exact: true }).click();
    await partnerPage.goto(`/app/states/${secondId}/manage?section=diplomacy`);
    const otherCard = partnerPage
      .getByRole('heading', { name: `Общий налоговый договор ${suffix} · № 1`, exact: true })
      .locator('xpath=..');
    await expect(otherCard).toContainText('Ожидает подтверждения');
    await otherCard.getByRole('button', { name: 'Утвердить своей стороной', exact: true }).click();
    await partnerPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Подтвердить государственное решение', exact: true })
      .click();
    await expect(otherCard).toContainText('Действует');
    await partnerPage.evaluate(() => {
      globalThis.scrollTo(0, 0);
    });
    await partnerPage.screenshot({
      fullPage: true,
      path: `/tmp/tax-treaty-ratified-${testInfo.project.name}.png`,
    });
    await partnerPage.setViewportSize({ width: 390, height: 844 });
    expect(
      await partnerPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await partnerPage.evaluate(() => {
      globalThis.scrollTo(0, 0);
    });
    await partnerPage.screenshot({
      fullPage: true,
      path: `/tmp/tax-treaty-ratified-mobile-${testInfo.project.name}.png`,
    });
    await partnerPage.setViewportSize({ width: 1440, height: 1000 });
    await transfer(page, { code, recipient: recipientName, expected: '106,00' });
    await page.evaluate(() => {
      globalThis.scrollTo(0, 0);
    });
    await page.screenshot({ path: `/tmp/tax-wallet-${testInfo.project.name}.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `/tmp/tax-wallet-mobile-${testInfo.project.name}.png`,
      fullPage: true,
    });
    const firstResponse = await page.request.get(`/api/v1/account/states/${firstId}/taxation`);
    const first = StateTaxationSchema.parse(await firstResponse.json());
    const secondResponse = await partner.request.get(`/api/v1/account/states/${secondId}/taxation`);
    const second = StateTaxationSchema.parse(await secondResponse.json());
    expect(first.totals.find((total) => total.currencyId === currencyId)?.amountMinor).toBe('800');
    expect(second.totals.find((total) => total.currencyId === currencyId)?.amountMinor).toBe('600');
    const recipientResponse = await recipient.request.get('/api/v1/account/wallet');
    expect(WalletSchema.parse(await recipientResponse.json()).accounts[0]?.balanceMinor).toBe(
      '20000',
    );
    const ownWalletResponse = await page.request.get('/api/v1/account/wallet');
    const ownWallet = WalletSchema.parse(await ownWalletResponse.json());
    const principal = ownWallet.transactions.find(
      (entry) => entry.amountMinor === '10000' && entry.economicOperationId !== null,
    );
    if (principal === undefined || principal.economicOperationId === null) {
      throw new Error('Economic history missing');
    }
    const historyBefore = await page.request.get(
      `/api/v1/account/economic-operations/${principal.economicOperationId}`,
    );
    const savedHistory = await historyBefore.text();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/app/states/${firstId}/manage?section=taxation`);
    await page.getByRole('button', { name: 'Изменить закон', exact: true }).click();
    await page.getByLabel('Ставка, базисные пункты', { exact: true }).fill('700');
    await page.getByLabel('Дата вступления в силу', { exact: true }).fill('2099-01-01T00:00');
    await confirmDecision(page);
    const historyAfter = await page.request.get(
      `/api/v1/account/economic-operations/${principal.economicOperationId}`,
    );
    expect(await historyAfter.text()).toBe(savedHistory);
    await page
      .getByRole('button', { name: 'ⓘ Множественное налогообложение', exact: true })
      .focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toContainText('Каждый закон применяется один раз');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.evaluate(() => {
      globalThis.scrollTo(0, 0);
    });
    await page.screenshot({ path: `/tmp/tax-state-${testInfo.project.name}.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `/tmp/tax-state-mobile-${testInfo.project.name}.png`,
      fullPage: true,
    });
    const noJs = await browser.newContext({ baseURL: origin, javaScriptEnabled: false });
    const publicPage = await noJs.newPage();
    await publicPage.goto(`/states/tax-a-${suffix}/taxation`);
    await expect(publicPage.getByRole('heading', { level: 1 })).toContainText(
      `Налоговая Авроры ${suffix}`,
    );
    await expect(
      publicPage.getByRole('link', { name: `Налог Авроры ${suffix}`, exact: true }),
    ).toBeVisible();
    await publicPage.screenshot({
      path: `/tmp/tax-public-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await publicPage.setViewportSize({ width: 390, height: 844 });
    expect(
      await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await publicPage.screenshot({
      path: `/tmp/tax-public-mobile-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await publicPage.getByRole('link', { name: `Налог Авроры ${suffix}`, exact: true }).click();
    await expect(publicPage.getByRole('heading', { level: 1 })).toContainText(
      `Налог Авроры ${suffix}`,
    );
    const lawHistoryUrl = new URL(publicPage.url());
    lawHistoryUrl.searchParams.set('page', '2');
    lawHistoryUrl.searchParams.set('lang', 'ru');
    await publicPage.goto(lawHistoryUrl.href);
    await expect(
      publicPage.getByText('На этой странице редакций нет.', { exact: true }),
    ).toBeVisible();
    await publicPage.getByRole('link', { name: 'Назад', exact: true }).click();
    await expect(publicPage.getByRole('heading', { level: 1 })).toContainText(
      `Налог Авроры ${suffix}`,
    );
    await publicPage.goto('/treaties');
    await publicPage
      .getByRole('link', { name: `Общий налоговый договор ${suffix}`, exact: true })
      .click();
    await expect(publicPage.getByRole('heading', { level: 1 })).toContainText(
      `Общий налоговый договор ${suffix}`,
    );
    expect(await publicPage.content()).not.toContain('Приватный перевод с налогами');
    await noJs.close();
  } finally {
    for (const stateId of ids) {
      // oxlint-disable-next-line no-await-in-loop -- Retain browser fixture history while removing active homepage ranking effects.
      await post(admin.request, `/admin/states/${stateId}/status`, {
        origin,
        data: {
          status: 'SUSPENDED',
          reason: 'Tax browser fixture complete; preserve immutable financial history',
        },
      });
    }
    await admin.close();
    await partner.close();
    await recipient.close();
  }
});
