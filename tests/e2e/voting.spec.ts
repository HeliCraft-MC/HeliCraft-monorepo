import { expect } from '@playwright/test';
import { test } from './fixtures';

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
  await page.getByRole('button', { name: 'Создать опрос', exact: true }).click();
  await page.getByLabel('Название опроса · Русский', { exact: true }).fill(title);
  await page
    .getByLabel('Текст вопроса · Русский', { exact: true })
    .fill('Поддерживаете предложение?');
  await page.getByLabel('Ответ 1 · Русский', { exact: true }).fill('За предложение');
  await page.getByLabel('Ответ 2 · Русский', { exact: true }).fill('Против предложения');
  await page.getByLabel('Видимость результатов', { exact: true }).selectOption('PUBLIC');
  await page.getByRole('button', { name: 'Сохранить черновик опроса', exact: true }).click();
  const adminCard = page
    .getByRole('heading', { name: title, exact: true })
    .locator('xpath=ancestor::section[1]');
  await adminCard.getByRole('button', { name: 'Редактировать черновик', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Черновик опроса', exact: true });
  await editor.getByLabel('Описание опроса · Русский', { exact: true }).fill('Изменённый черновик');
  await editor.getByRole('button', { name: 'Сохранить изменения', exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(adminCard.getByText('Изменённый черновик', { exact: true })).toBeVisible();
  await adminCard.getByRole('button', { name: 'Опубликовать голосование', exact: true }).click();
  await expect(adminCard.getByText('Идёт голосование', { exact: false })).toBeVisible();
  await page.goto('/app/votings');
  const userCard = page
    .getByRole('heading', { name: title, exact: true })
    .locator('xpath=ancestor::section[1]');
  const rules = userCard.locator('details').filter({ hasText: 'Правила голосования' });
  await rules.locator('summary').click();
  await rules.getByRole('button', { name: 'ⓘ Кворум', exact: true }).click();
  await expect(page.getByText(/Минимальная доля избирателей, участвующих/u)).toBeVisible();
  await page.keyboard.press('Escape');
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

test('multi-question poll retains answers independently and requires a complete ballot', async ({
  page,
}) => {
  const title = `Опрос с вопросами ${crypto.randomUUID()}`;
  await page.goto('/login?returnTo=/admin/votings');
  await page.getByLabel('Ник', { exact: true }).fill('E2eOwner');
  await page.getByLabel('Пароль', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/votings$/u);
  await page.getByRole('button', { name: 'Создать опрос', exact: true }).click();
  await page.getByLabel('Название опроса · Русский', { exact: true }).fill(title);
  await page.getByLabel('Текст вопроса · Русский', { exact: true }).fill('Строим порт?');
  await page.getByLabel('Ответ 1 · Русский', { exact: true }).fill('Строим');
  await page.getByLabel('Ответ 2 · Русский', { exact: true }).fill('Не строим');
  await page.getByRole('button', { name: 'Добавить вопрос', exact: true }).click();
  await page.getByLabel('Текст вопроса · Русский', { exact: true }).nth(1).fill('Где строим?');
  await page.getByLabel('Ответ 1 · Русский', { exact: true }).nth(1).fill('На севере');
  await page.getByLabel('Ответ 2 · Русский', { exact: true }).nth(1).fill('На юге');
  await page.getByRole('button', { name: 'ⓘ Кворум, %', exact: true }).click();
  await expect(page.getByText(/Минимальная доля избирателей/u)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByLabel('Видимость результатов', { exact: true }).selectOption('PUBLIC');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/helicraft-poll-editor-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Опубликовать опрос', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await page.goto('/app/votings');
  const ballot = page
    .getByRole('heading', { name: title, exact: true })
    .locator('xpath=ancestor::section[1]');
  await ballot.getByLabel('Строим', { exact: true }).check();
  await expect(ballot.getByRole('button', { name: 'Проголосовать', exact: true })).toBeDisabled();
  await ballot.getByLabel('На севере', { exact: true }).check();
  await ballot.getByLabel('Не строим', { exact: true }).check();
  await expect(ballot.getByLabel('На севере', { exact: true })).toBeChecked();
  await ballot.getByRole('button', { name: 'Проголосовать', exact: true }).click();
  await expect(ballot.getByText('Ваш голос принят', { exact: true })).toBeVisible();
  await expect(ballot.getByText(/Участие: 1\//u)).toBeVisible();
});

// oxlint-disable-next-line max-statements, max-lines-per-function -- One browser scenario follows a survey through creation, participation, reopening, response deletion and archival.
test('survey constructor autosaves mixed blocks and administrators manage responses and reopening', async ({
  page,
}) => {
  const title = `Анкета сообщества ${crypto.randomUUID()}`;
  await page.goto('/login?returnTo=/admin/votings');
  await page.getByLabel('Ник', { exact: true }).fill('E2eOwner');
  await page.getByLabel('Пароль', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/votings$/u);
  await page.getByRole('button', { name: 'Создать опрос', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Новый опрос', exact: true });
  await editor.getByLabel('Формат опроса', { exact: true }).selectOption('SURVEY');
  await editor.getByLabel('Название опроса · Русский', { exact: true }).fill(title);
  await editor
    .getByLabel('Заголовок блока · Русский', { exact: true })
    .fill('Какой проект предложите?');
  await editor.getByLabel('Обязательный вопрос', { exact: true }).check();
  await editor.getByRole('button', { name: 'Добавить блок', exact: true }).click();
  const choice = editor.getByRole('region', { name: 'Блок 2', exact: true });
  await choice.getByLabel('Тип блока', { exact: true }).selectOption('CHECKBOX');
  await choice.getByLabel('Заголовок блока · Русский', { exact: true }).fill('Куда отправиться?');
  await choice.getByLabel('Вариант 1 · Русский', { exact: true }).fill('На север');
  await choice.getByLabel('Вариант 2 · Русский', { exact: true }).fill('На юг');
  await choice.getByLabel('Обязательный вопрос', { exact: true }).check();
  await editor.getByRole('button', { name: 'Добавить блок', exact: true }).click();
  const note = editor.getByRole('region', { name: 'Блок 3', exact: true });
  await note.getByLabel('Тип блока', { exact: true }).selectOption('TEXT_BLOCK');
  await note
    .getByLabel('Содержимое блока · Русский', { exact: true })
    .fill('**Спасибо за предложения!**');
  await editor.getByRole('button', { name: 'Добавить блок', exact: true }).click();
  const imageBlock = editor.getByRole('region', { name: 'Блок 4', exact: true });
  await imageBlock.getByLabel('Тип блока', { exact: true }).selectOption('IMAGE_BLOCK');
  const imageTitle = `${title} — иллюстрация`;
  await imageBlock.getByLabel('Название нового снимка', { exact: true }).fill(imageTitle);
  await imageBlock
    .getByLabel('Загрузить изображение', { exact: true })
    .setInputFiles('apps/vega/public/world/town.webp');
  await expect(imageBlock.getByRole('img', { name: imageTitle, exact: true })).toBeVisible();
  await editor.getByLabel('Видимость результатов', { exact: true }).selectOption('PUBLIC');
  await expect(editor.getByText('Черновик сохранён', { exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'Предпросмотр анкеты', exact: true }).click();
  await expect(editor.getByLabel('Какой проект предложите? *', { exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'Вернуться к редактору', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/helicraft-survey-editor-${test.info().project.name}.png`,
    fullPage: true,
  });
  await editor.getByRole('button', { name: 'Опубликовать опрос', exact: true }).click();
  await expect(editor).toBeHidden();
  const card = page
    .getByRole('heading', { name: title, exact: true })
    .locator('xpath=ancestor::section[1]');
  const href = await card
    .getByRole('link', { name: 'Открыть по ссылке', exact: true })
    .getAttribute('href');
  if (href === null) {
    throw new Error('Missing survey link');
  }
  await page.goto(href);
  await expect(page.getByText('Спасибо за предложения!', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: imageTitle, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Отправить ответы', exact: true }).click();
  await expect(page.getByText('Ваш ответ принят', { exact: true })).toBeHidden();
  await page.getByLabel('Какой проект предложите? *', { exact: true }).fill('Построить порт');
  await page.getByRole('checkbox', { name: 'На север', exact: true }).check();
  await page.getByRole('button', { name: 'Отправить ответы', exact: true }).click();
  await expect(page.getByText('Ваш ответ принят', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Отправить ответы', exact: true })).toBeHidden();
  await page.goto('/admin/votings');
  await card.locator('summary').filter({ hasText: 'Просмотр ответов' }).click();
  await expect(card.getByRole('cell', { name: 'Построить порт', exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Закрыть анкету', exact: true }).click();
  let management = page.getByRole('dialog', { name: 'Управление анкетой', exact: true });
  await management.getByRole('button', { name: 'Подтвердить', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Переоткрыть анкету', exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Переоткрыть анкету', exact: true }).click();
  management = page.getByRole('dialog', { name: 'Управление анкетой', exact: true });
  await management.getByRole('button', { name: 'Подтвердить', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Закрыть анкету', exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Удалить ответ', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Удалить ответ?', exact: true })
    .getByRole('button', { name: 'Подтвердить удаление', exact: true })
    .click();
  await expect(card.getByText('Принято ответов: 0', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'В архив', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Управление анкетой', exact: true })
    .getByRole('button', { name: 'Подтвердить', exact: true })
    .click();
  await expect(card.getByText('В архиве', { exact: false })).toBeVisible();
  await page.goto(href);
  await expect(page.getByRole('alert')).toContainText('Голосование не найдено');
});
