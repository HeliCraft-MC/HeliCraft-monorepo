import { expect } from '@playwright/test';
import type { APIRequestContext, Page, Response as BrowserResponse } from '@playwright/test';
import { test } from './fixtures';
import { DraftSchema, StateDetailSchema } from '../../apps/antares/src/modules/states/contracts';
import { applyPreset } from '../../apps/antares/src/modules/states/presets';
import { PASSWORD, register, post, stringField } from './taxation-fixture';

async function createState(request: APIRequestContext, origin: string): Promise<string> {
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 9);
  const cofounderId = await register(request, origin, `tc${suffix}`);
  const founderId = await register(request, origin, `tf${suffix}`);
  const draft = DraftSchema.parse(
    await post(request, '/account/state-drafts', {
      origin,
      data: { title: 'Territory authority regression' },
    }),
  );
  const saved = await request.put(`/api/v1/account/state-drafts/${draft.id}`, {
    headers: { Origin: origin },
    data: {
      version: draft.version,
      title: draft.title,
      step: 1,
      configuration: {
        ...draft.configuration,
        name: { ru: 'Тест территориальных полномочий' },
        slug: `territory-${suffix}`,
        cofounderIds: [cofounderId],
        governance: applyPreset('AUTOCRACY', founderId),
      },
    },
  });
  expect(saved.ok()).toBe(true);
  const result = DraftSchema.parse(await saved.json());
  return stringField(
    await post(request, `/account/state-drafts/${draft.id}/submit`, {
      origin,
      data: { version: result.version },
    }),
    'stateId',
  );
}

async function savedTerritoryPolicy(response: BrowserResponse): Promise<boolean> {
  if (
    response.request().method() !== 'PUT' ||
    !response.url().includes('/api/v1/account/state-drafts/')
  ) {
    return false;
  }
  const parsed = DraftSchema.safeParse(await response.json());
  return (
    parsed.success &&
    parsed.data.configuration.governance.policies.some(
      (policy) =>
        policy.action === 'CHANGE_TERRITORY' &&
        policy.mechanism === 'SINGLE_OFFICE' &&
        policy.officeIds.length === 1,
    )
  );
}
async function configureTerritoryPolicy(
  page: Page,
  stateId: string,
  evidenceName: string,
): Promise<void> {
  await page.goto(`/app/states/${stateId}/manage?section=territory`);
  await expect(
    page.getByText(
      'В действующем устройстве государства не настроена процедура «Изменение территории». Её можно добавить через реформу:',
      { exact: true },
    ),
  ).toBeVisible();
  expect(
    (await page.request.get(`/api/v1/account/states/${stateId}/territory/drafts`)).status(),
  ).toBe(403);
  await page.getByRole('button', { name: 'Предложить реформу устройства', exact: true }).click();
  await page.getByRole('button', { name: '9. Государственные решения', exact: true }).click();
  const policy = page
    .getByRole('heading', { name: 'Изменение территории', exact: true })
    .locator('..');
  await expect(
    policy.getByText('Процедура не настроена. Действие запрещено до принятия реформы.', {
      exact: true,
    }),
  ).toBeVisible();
  await policy.getByRole('button', { name: 'Настроить процедуру', exact: true }).click();
  await policy.getByLabel('Кто принимает решение?', { exact: true }).selectOption('SINGLE_OFFICE');
  const saved = page.waitForResponse(savedTerritoryPolicy);
  await policy.getByLabel('Правитель', { exact: true }).check();
  await saved;
  await expect(page.getByText('Сохранено', { exact: true })).toBeVisible();
  await page.reload();
  await expect(policy.getByLabel('Кто принимает решение?', { exact: true })).toHaveValue(
    'SINGLE_OFFICE',
  );
  await expect(policy.getByLabel('Правитель', { exact: true })).toBeChecked();
  expect(
    (await page.request.get(`/api/v1/account/states/${stateId}/territory/drafts`)).status(),
  ).toBe(403);
  await page.screenshot({
    path: `/tmp/territory-policy-${evidenceName}.png`,
    fullPage: true,
  });
}

test('adds territory authority through the real reform editor and grants access only after publication', async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(90_000);
  const origin = testInfo.project.use.baseURL;
  if (origin === undefined) {
    throw new Error('Missing browser origin');
  }
  const stateId = await createState(page.request, origin);
  const admin = await browser.newContext({ baseURL: origin });
  try {
    await post(admin.request, '/auth/login', {
      origin,
      data: { username: 'E2eOwner', password: PASSWORD },
    });
    await post(admin.request, `/admin/states/${stateId}/status`, {
      origin,
      data: { status: 'ACTIVE', reason: 'Territorial procedure browser regression' },
    });
    await configureTerritoryPolicy(page, stateId, testInfo.project.name);
    await page.getByRole('button', { name: '12. Проверка', exact: true }).click();
    await page.getByRole('button', { name: 'Отправить на рассмотрение', exact: true }).click();
    await page.getByRole('button', { name: /^Одобрить от должности:/u }).click();
    await page
      .getByRole('button', { name: 'Опубликовать одобренную реформу', exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/app/states/${stateId}/manage`, 'u'));
    await page.goto(`/app/states/${stateId}/manage?section=territory`);
    await expect(page.getByLabel('Мир нового черновика', { exact: true })).toBeVisible();
    const current = await page.request.get(`/api/v1/account/states/${stateId}`);
    const state = StateDetailSchema.parse(await current.json());
    expect(
      state.configuration.governance.policies.find((item) => item.action === 'CHANGE_TERRITORY'),
    ).toMatchObject({ mechanism: 'SINGLE_OFFICE' });
    expect(
      (await page.request.get(`/api/v1/account/states/${stateId}/territory/drafts`)).status(),
    ).toBe(200);
  } finally {
    await admin.close();
  }
});
