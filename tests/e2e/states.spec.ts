import { assertOfficeAssignmentPages } from './office-assignments';
import {
  assertPublicProfilePages,
  assertManagementPage,
  assertStateFits,
} from './state-public-pages';
import { expect } from '@playwright/test';
import { test } from './fixtures';
import { DraftSchema } from '../../apps/antares/src/modules/states/contracts';

// oxlint-disable max-lines, max-lines-per-function, max-statements -- This sequential real-browser lifecycle covers a resumable wizard, admin review and JavaScript-free SSR.
const PASSWORD = 'Browser test password 2026';
test('resumes a multilingual state draft, edits governance and constitution, then receives admin approval and public SSR', async ({
  page,
  browser,
}, testInfo) => {
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 9);
  const username = `s${suffix}`;
  const cofounder = `c${suffix}`;
  const slug = `aurora-${suffix}`;
  const origin = testInfo.project.use.baseURL;
  if (origin === undefined) {
    throw new Error('Missing test origin');
  }
  for (const name of [cofounder, username]) {
    // oxlint-disable-next-line no-await-in-loop -- Registration uses one browser cookie jar; sequential requests preserve the session.
    const response = await page.request.post('/api/v1/auth/register', {
      headers: { Origin: origin },
      data: { username: name, password: PASSWORD },
    });
    expect(response.ok()).toBe(true);
  }
  await page.goto('/login?returnTo=/app/states/new');
  await page.getByLabel('Ник', { exact: true }).fill(username);
  await page.getByLabel('Пароль', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/states\/new$/u);
  await page.getByRole('button', { name: 'Создать новый черновик' }).click();
  await expect(page).toHaveURL(/\/app\/states\/drafts\//u);
  const draftId = new URL(page.url()).pathname.split('/').at(-1);
  if (draftId === undefined) {
    throw new Error('Missing draft id');
  }
  await page.getByLabel('Название государства · Русский', { exact: true }).fill(`Аврора ${suffix}`);
  const localizedName = page
    .getByLabel('Название государства · Русский', { exact: true })
    .locator('xpath=ancestor::fieldset[1]');
  await localizedName.getByRole('combobox', { name: 'Язык перевода' }).selectOption('en');
  await page.getByLabel('Название государства · English', { exact: true }).fill(`Aurora ${suffix}`);
  await page.getByLabel('Адрес государства', { exact: true }).fill(slug);
  await page.getByRole('button', { name: '2. Флаги', exact: true }).click();
  await page.getByRole('button', { name: 'Крипер', exact: true }).click();
  const bannerPreview = page.getByRole('img', { name: 'Предпросмотр флага', exact: true });
  const verticalBox = await bannerPreview.boundingBox();
  if (!verticalBox) {
    throw new Error('Vertical preview missing');
  }
  expect(verticalBox.width / verticalBox.height).toBeCloseTo(0.5, 2);
  await page.screenshot({
    path: `/tmp/banner-editor-vertical-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Горизонтальный флаг', exact: true }).click();
  await page.getByRole('button', { name: 'Скопировать вертикальный баннер' }).click();
  await page
    .getByRole('group', { name: 'Цвет основы', exact: true })
    .getByRole('button', { name: 'Красный', exact: true })
    .click();
  const horizontalBox = await bannerPreview.boundingBox();
  if (!horizontalBox) {
    throw new Error('Horizontal preview missing');
  }
  expect(horizontalBox.width / horizontalBox.height).toBeCloseTo(2, 2);
  await page.getByRole('button', { name: 'Вертикальный баннер', exact: true }).click();
  await expect(
    page
      .getByRole('group', { name: 'Цвет основы', exact: true })
      .getByRole('button', { name: 'Синий', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Горизонтальный флаг', exact: true }).click();
  await page.setViewportSize({ width: 1000, height: 1100 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/banner-editor-horizontal-tablet-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
  ).toBe(true);
  const mobileHorizontalBox = await bannerPreview.boundingBox();
  if (!mobileHorizontalBox) {
    throw new Error('Mobile horizontal preview missing');
  }
  expect(mobileHorizontalBox.width / mobileHorizontalBox.height).toBeCloseTo(2, 2);
  await page.getByRole('button', { name: 'Вертикальный баннер', exact: true }).click();
  const mobileVerticalBox = await bannerPreview.boundingBox();
  if (!mobileVerticalBox) {
    throw new Error('Mobile vertical preview missing');
  }
  expect(mobileVerticalBox.width / mobileVerticalBox.height).toBeCloseTo(0.5, 2);
  await page.screenshot({
    path: `/tmp/banner-editor-mobile-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Горизонтальный флаг', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByLabel('Источник флага', { exact: true }).selectOption('PNG');
  await page
    .getByLabel('PNG до 2 МБ, не более 4096×4096', { exact: true })
    .setInputFiles('apps/antares/tests/fixtures/state-flag.png');
  await expect(page.getByRole('img', { name: 'Флаг', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '3. Основатели', exact: true }).click();
  await page.getByLabel('Сооснователи', { exact: true }).fill(cofounder);
  await page.getByRole('button', { name: cofounder, exact: true }).click();
  await page.getByRole('button', { name: '5. Шаблон и режим', exact: true }).click();
  await page.getByRole('button', { name: 'Автократия', exact: true }).click();
  await page.getByRole('button', { name: '6. Должности', exact: true }).click();
  await page.getByLabel('Название должности · Русский', { exact: true }).fill('Правитель Авроры');
  await page.getByRole('button', { name: '9. Государственные решения', exact: true }).click();
  await page.getByLabel('Настройки решений', { exact: true }).selectOption('tax');
  const law = page
    .getByRole('heading', { name: 'Принятие законов', exact: true })
    .locator('xpath=..');
  await law.getByLabel('Кто принимает решение?', { exact: true }).selectOption('ANY_OF_OFFICES');
  await page.getByRole('button', { name: '11. Конституция', exact: true }).click();
  await page.getByLabel('Формальная Конституция', { exact: true }).selectOption('YES');
  await page
    .getByLabel('Название Конституции · Русский', { exact: true })
    .fill('Конституция Авроры');
  await page.getByRole('button', { name: 'Начать с шаблона', exact: true }).click();
  await page.getByRole('button', { name: 'Исходный Markdown', exact: true }).click();
  const constitutionSource =
    '# Права граждан\n\n{{block.FOUNDERS}}\n\nГраждане участвуют в жизни государства.\nСледующая строка.\n\n- Права\n    - Участие\n\n{{block.GOVERNANCE_SUMMARY}}';
  await page.getByLabel('Текст Конституции · RU', { exact: true }).fill(constitutionSource);
  await expect
    .poll(async () => {
      const response = await page.request.get(`/api/v1/account/state-drafts/${draftId}`);
      const document = DraftSchema.parse(await response.json()).configuration.constitution;
      return document?.blocks[0]?.type === 'MARKDOWN' ? document.blocks[0].content.ru : null;
    })
    .toBe(constitutionSource);
  await page.getByRole('button', { name: 'Превью документа', exact: true }).click();
  await expect(page.getByLabel('Текст Конституции · RU', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Живой предпросмотр', exact: true })).toContainText(
    'основано игроками',
  );
  await page.getByRole('button', { name: 'Текстовый редактор', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Текст Конституции · RU', exact: true }),
  ).toContainText('Права граждан');
  await page
    .getByRole('textbox', { name: 'Текст Конституции · RU', exact: true })
    .press('Control+End');
  await page.getByRole('textbox', { name: 'Текст Конституции · RU', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Жирный', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Текст Конституции · RU', exact: true })
    .pressSequentially('Общее благо');
  await page.getByRole('button', { name: 'Исходный Markdown', exact: true }).click();
  await expect(page.getByLabel('Текст Конституции · RU', { exact: true })).toHaveValue(
    /\*\*Общее благо\*\*/u,
  );
  await expect
    .poll(async () => {
      const response = await page.request.get(`/api/v1/account/state-drafts/${draftId}`);
      const document = DraftSchema.parse(await response.json()).configuration.constitution;
      return document?.blocks[0]?.type === 'MARKDOWN' ? document.blocks[0].content.ru : null;
    })
    .toContain('**Общее благо**');
  await page.goto('/app/states/new');
  await page.getByRole('link', { name: 'Новое государство', exact: true }).click();
  await expect(page.getByLabel('Название Конституции · Русский', { exact: true })).toHaveValue(
    'Конституция Авроры',
  );
  await page.setViewportSize({ width: 1000, height: 1100 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
  ).toBe(true);
  await page.getByRole('button', { name: 'Предпросмотр', exact: true }).click();
  const preview = page.getByRole('dialog', { name: 'Предпросмотр Конституции', exact: true });
  await expect(preview.getByRole('heading', { name: 'Права граждан', exact: true })).toBeVisible();
  await preview.screenshot({ path: `/tmp/constitution-preview-${test.info().project.name}.png` });
  await preview.getByLabel('Язык документа', { exact: true }).selectOption('en');
  await expect(
    preview.getByRole('heading', { name: 'State decisions', exact: true }),
  ).toBeVisible();
  await preview.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await expect(preview).not.toBeAttached();
  await expect(page.getByLabel('Язык документа', { exact: true })).toHaveValue('ru');
  await page.screenshot({
    path: `/tmp/constitution-editor-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: '12. Проверка', exact: true }).click();
  await page.getByRole('button', { name: 'Проверить конфигурацию', exact: true }).click();
  await page.getByRole('button', { name: 'Создать государство', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/states\/[0-9a-f-]+\/manage\?section=overview$/u);
  await expect(page.getByText('Ожидает одобрения администрации', { exact: true })).toBeVisible();
  const stateId = new URL(page.url()).pathname.split('/').at(-2);
  if (stateId === undefined) {
    throw new Error('Missing state id');
  }
  const adminContext = await browser.newContext({ baseURL: origin });
  const admin = await adminContext.newPage();
  try {
    await admin.goto(`/login?returnTo=/admin/states/${stateId}`);
    await admin.getByLabel('Ник', { exact: true }).fill('E2eOwner');
    await admin.getByLabel('Пароль', { exact: true }).fill(PASSWORD);
    await admin.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect
      .poll(
        async () =>
          await admin
            .getByRole('img', { name: 'Флаг государства', exact: true })
            .evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth === 64),
      )
      .toBe(true);
    await admin
      .getByLabel('Причина решения или исправления', { exact: true })
      .fill('Конфигурация проверена');
    await admin.getByRole('button', { name: 'Одобрить', exact: true }).click();
    await page.goto(`/app/states/${stateId}/proposals`);
    await expect(
      page.getByRole('heading', { name: 'Предложений пока нет', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Предложить изменение', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Управление государством', exact: true })
      .getByRole('link', { name: 'Обзор', exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/app/states/${stateId}/manage\\?section=overview$`, 'u'),
    );
    await assertManagementPage(page, stateId, testInfo.project.name);
    await expect(admin.getByText('Активно', { exact: true })).toBeVisible();
    await expect(admin.getByText('Конфигурация проверена', { exact: true })).toBeVisible();
    const publicContext = await browser.newContext({
      baseURL: origin,
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    try {
      const publicPage = await publicContext.newPage();
      await publicPage.goto('/');
      await expect(publicPage.locator('header a[href="/states"]').first()).toHaveAttribute(
        'href',
        '/states',
      );
      // The home preview contains the three most populous states; new states use the full directory.
      await expect(publicPage.locator('#states a[href^="/states/"]')).toHaveCount(3);
      await publicPage
        .locator('#states')
        .screenshot({ path: `/tmp/helicraft-home-states-${test.info().project.name}.png` });
      await publicPage.goto('/states');
      await publicPage.getByLabel('Поиск', { exact: true }).fill(`Аврора ${suffix}`);
      await publicPage.getByLabel('Конституция', { exact: true }).selectOption('YES');
      await publicPage.getByLabel('Сортировка', { exact: true }).selectOption('NAME');
      await publicPage.getByRole('button', { name: 'Найти государства', exact: true }).click();
      await expect(publicPage.getByText('Найдено государств: 1', { exact: true })).toBeVisible();
      await expect(
        publicPage.getByRole('heading', { name: `Аврора ${suffix}`, exact: true }),
      ).toBeVisible();
      await assertStateFits(publicPage);
      await publicPage.screenshot({
        path: `/tmp/helicraft-state-directory-mobile-${test.info().project.name}.png`,
        fullPage: true,
      });
      await publicPage.setViewportSize({ width: 1440, height: 1000 });
      await publicPage.screenshot({
        path: `/tmp/helicraft-state-directory-desktop-${test.info().project.name}.png`,
        fullPage: true,
      });
      await publicPage.setViewportSize({ width: 390, height: 844 });
      await publicPage.getByLabel('Приём граждан', { exact: true }).selectOption('BY_INVITATION');
      await publicPage.getByRole('button', { name: 'Найти государства', exact: true }).click();
      await expect(
        publicPage.getByRole('heading', { name: 'Государства не найдены', exact: true }),
      ).toBeVisible();
      await publicPage.goto(`/states/${slug}`);
      await expect
        .poll(
          async () =>
            await publicPage
              .getByRole('img', { name: 'Флаг государства', exact: true })
              .evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth === 64),
        )
        .toBe(true);
      await assertStateFits(publicPage);
      await expect(
        publicPage.getByRole('heading', { name: `Аврора ${suffix}`, exact: true }).first(),
      ).toBeVisible();
      await publicPage.getByRole('link', { name: 'Читать конституцию', exact: true }).click();
      await expect(
        publicPage.getByRole('heading', { name: 'Права граждан', exact: true }),
      ).toBeVisible();
      await publicPage.goto(`/states/${slug}`);
      await assertPublicProfilePages(publicPage, { username, suffix }, testInfo.project.name);
    } finally {
      await publicContext.close();
    }
    await assertOfficeAssignmentPages(page, admin, {
      stateId,
      founderName: username,
      successorName: cofounder,
      projectName: testInfo.project.name,
    });
  } finally {
    await adminContext.close();
  }
});
