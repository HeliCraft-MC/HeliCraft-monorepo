// oxlint-disable max-lines-per-function -- The institution lifecycle verifies scoped authority, initial procedure publication and preserved history together.
import { expect } from '@playwright/test';
import { test } from './fixtures';
import { DraftSchema, StateDetailSchema } from '../../apps/antares/src/modules/states/contracts';
import { applyPreset } from '../../apps/antares/src/modules/states/presets';
import { PASSWORD, register, post, stringField } from './taxation-fixture';

function originOf(value: string | undefined): string {
  if (value === undefined) {
    throw new Error('Missing browser origin');
  }
  return value;
}
test('state management explains missing diplomacy, blocks office-holder departure and configures an institution at establishment', async ({
  page,
  browser,
}, testInfo) => {
  const origin = originOf(testInfo.project.use.baseURL);
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 10);
  const founderId = await register(page.request, origin, `i${suffix}`);
  const draft = DraftSchema.parse(
    await post(page.request, '/account/state-drafts', {
      origin,
      data: { title: 'Учреждение институтов' },
    }),
  );
  const governance = applyPreset('AUTOCRACY', founderId);
  const [office] = governance.offices;
  if (office === undefined) {
    throw new Error('Missing fixture office');
  }
  const saved = await page.request.put(`/api/v1/account/state-drafts/${draft.id}`, {
    headers: { Origin: origin },
    data: {
      version: draft.version,
      title: draft.title,
      step: 1,
      configuration: {
        ...draft.configuration,
        name: { ru: `Заря ${suffix}` },
        slug: `aurora-${suffix}`,
        governance: {
          ...governance,
          policies: [
            ...governance.policies,
            {
              action: 'CREATE_INSTITUTION',
              mechanism: 'SINGLE_OFFICE',
              officeIds: [office.id],
              vote: null,
              manualProcedure: {},
            },
          ],
        },
      },
    },
  });
  expect(saved.ok()).toBe(true);
  const { version } = DraftSchema.parse(await saved.json());
  const stateId = stringField(
    await post(page.request, `/account/state-drafts/${draft.id}/submit`, {
      origin,
      data: { version },
    }),
    'stateId',
  );
  const admin = await browser.newContext({ baseURL: origin });
  try {
    await post(admin.request, '/auth/login', {
      origin,
      data: { username: 'E2eOwner', password: PASSWORD },
    });
    await post(admin.request, `/admin/states/${stateId}/status`, {
      origin,
      data: { status: 'ACTIVE', reason: 'Reviewed institution browser fixture' },
    });
    await page.goto(`/app/states/${stateId}/manage?section=diplomacy`);
    const nav = page.getByRole('navigation', { name: 'Управление государством', exact: true });
    await expect(nav.getByRole('link', { name: 'Дипломатия', exact: true })).toBeVisible();
    await expect(
      page.getByText('Подписание договоров недоступно: процедура не настроена.', { exact: false }),
    ).toBeVisible();
    await expect(page.locator('aside svg').first()).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Дипломатия', exact: true })).toHaveCSS(
      'box-shadow',
      'none',
    );
    await nav.getByRole('link', { name: 'Моё гражданство', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Покинуть государство', exact: true }),
    ).toBeDisabled();
    await expect(page.getByText('Вы занимаете должность.', { exact: false })).toBeVisible();
    await nav.getByRole('link', { name: 'Реформы государства', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Предложения о государственном устройстве', exact: true }),
    ).toBeVisible();
    await nav.getByRole('link', { name: 'Центральный банк', exact: true }).click();
    await page.getByLabel('Название · Русский', { exact: true }).fill(`Банк ${suffix}`);
    const settings = page
      .getByRole('heading', { name: 'Создание валюты', exact: true })
      .locator('xpath=..');
    await settings.getByRole('button', { name: 'Настроить процедуру', exact: true }).click();
    await expect(settings.getByLabel('Кто принимает решение?', { exact: true })).toHaveValue(
      'CITIZEN_VOTE',
    );
    await page.getByRole('button', { name: 'Подать на утверждение', exact: true }).click();
    const confirmation = page.getByRole('dialog');
    await expect(confirmation.getByText('Первоначальные процедуры', { exact: true })).toBeVisible();
    await confirmation
      .getByRole('button', { name: 'Подтвердить распоряжение', exact: true })
      .click();
    await expect(confirmation).not.toBeVisible();
    await expect
      .poll(async () => {
        const current = await page.request.get(`/api/v1/account/states/${stateId}`);
        return StateDetailSchema.parse(await current.json()).configuration.governance.policies.some(
          (policy) => policy.action === 'CREATE_CURRENCY',
        );
      })
      .toBe(true);
    await expect(nav.getByRole('link', { name: 'Валюта', exact: true })).toBeVisible();
    await nav.getByRole('link', { name: 'История изменений', exact: true }).click();
    await expect(
      page.getByText('Первоначальные процедуры института утверждены', { exact: true }),
    ).toBeVisible();
    await page.goto('/app/states/new');
    await expect(
      page.locator(`a[href="/app/states/${stateId}/manage"]`).locator('svg[role="img"]'),
    ).toBeVisible();
  } finally {
    await admin.close();
  }
});
