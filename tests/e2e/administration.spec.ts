import { expect, test } from '@playwright/test';

const PASSWORD = 'Browser test password 2026';
test('OWNER manages real user roles/status and sees audit evidence', async ({
  page,
  request,
}, testInfo) => {
  const username = `a${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const origin = testInfo.project.use.baseURL;
  if (origin === undefined) {
    throw new Error('Missing test origin');
  }
  const created = await request.post('/api/v1/auth/register', {
    headers: { Origin: new URL(origin).origin },
    data: { username, password: PASSWORD },
  });
  expect(created.ok()).toBe(true);
  const user: unknown = await created.json();
  if (typeof user !== 'object' || user === null || !('id' in user) || typeof user.id !== 'string') {
    throw new Error('Missing registered UUID');
  }
  const uuid = user.id;
  await page.goto('/login?returnTo=/admin/users');
  await page.getByLabel('Ник', { exact: true }).fill('E2eOwner');
  await page.getByLabel('Пароль', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/users$/u);
  await page.getByLabel('Ник или UUID').fill(uuid);
  await page.getByRole('link', { name: username, exact: true }).click();
  await page.getByRole('checkbox', { name: 'EDITOR', exact: true }).check();
  await page.getByRole('button', { name: 'Сохранить роли', exact: true }).click();
  await expect
    .poll(async () => {
      const response = await page.request.get(`/api/v1/admin/users/${uuid}`);
      const details: unknown = await response.json();
      return details;
    })
    .toMatchObject({ roles: ['PLAYER', 'EDITOR'] });
  await page.getByLabel('Статус', { exact: true }).selectOption('SUSPENDED');
  await page.getByRole('button', { name: 'Сохранить статус', exact: true }).click();
  await expect
    .poll(async () => {
      const response = await request.get('/api/v1/auth/me');
      return response.status();
    })
    .toBe(401);
  await page.getByRole('link', { name: 'Аудит действий пользователя' }).click();
  await expect(page.getByLabel('UUID объекта', { exact: true })).toHaveValue(uuid);
  await page.getByLabel('Действие', { exact: true }).fill('user.status.changed');
  await expect(page.getByRole('cell', { name: `user / ${uuid}`, exact: true })).toBeVisible();
});
