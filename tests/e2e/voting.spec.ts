import { expect, test } from '@playwright/test';

const PASSWORD = 'Browser test password 2026';
test('admin publishes a saved global poll, a user votes, and results remain reviewable', async ({
  page,
}) => {
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 9);
  const title = `Общий опрос ${suffix}`;
  await page.goto('/login?returnTo=/admin/votings');
  await page.getByLabel('Ник', { exact: true }).fill('E2eOwner');
  await page.getByLabel('Пароль', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/votings$/u);
  await page.getByLabel('Название опроса · RU', { exact: true }).fill(title);
  await page.getByLabel('Вариант ответа · RU', { exact: true }).nth(0).fill('За предложение');
  await page.getByLabel('Вариант ответа · RU', { exact: true }).nth(1).fill('Против предложения');
  await page.getByLabel('Видимость результатов', { exact: true }).selectOption('PUBLIC');
  await page.getByRole('button', { name: 'Сохранить черновик опроса', exact: true }).click();
  const adminCard = page
    .getByRole('heading', { name: title, exact: true })
    .locator('xpath=ancestor::section[1]');
  await adminCard.getByRole('button', { name: 'Опубликовать голосование', exact: true }).click();
  await expect(adminCard.getByText('Идёт голосование', { exact: false })).toBeVisible();
  await page.goto('/app/votings');
  const userCard = page
    .getByRole('heading', { name: title, exact: true })
    .locator('xpath=ancestor::section[1]');
  await userCard.getByLabel('За предложение', { exact: true }).check();
  await userCard.getByRole('button', { name: 'Проголосовать', exact: true }).click();
  await expect(userCard.getByText('Ваш голос принят', { exact: true })).toBeVisible();
  await expect(userCard.getByText(/Участие: 1\//u)).toBeVisible();
  await page.goto('/admin/votings');
  await expect(adminCard.getByText(/Участие: 1\//u)).toBeVisible();
  await adminCard.getByRole('button', { name: 'Отменить голосование', exact: true }).click();
  await expect(adminCard.getByText('Отменено', { exact: false })).toBeVisible();
  await expect(adminCard.getByText(/Участие: 1\//u)).toBeVisible();
});
