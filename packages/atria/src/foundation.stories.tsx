import { useCallback } from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormField } from './form-field';
import { TextField } from './text-field';
import { PasswordField } from './password-field';
import { Textarea } from './textarea';
import { Select } from './select';
import { Checkbox } from './checkbox';
import { Alert } from './alert';
import { Badge, Card, EmptyState, Skeleton, Spinner } from './feedback';
import { Avatar } from './avatar';
import { MinecraftAvatar } from './minecraft-avatar';
import { MarkdownContent } from './markdown-content';
import { Table } from './table';
import { Breadcrumbs } from './breadcrumbs';
import { Dialog } from './dialog';
import { Tooltip } from './tooltip';
import { Tabs } from './tabs';
import { DropdownMenu } from './dropdown-menu';
import { ToastProvider } from './toast';
import { useToast } from './toast-manager';
import { Button } from './button';

function Forms(): ReactElement {
  return (
    <Card>
      <FormField label="Ник" htmlFor="example-name" hint="3–16 латинских букв">
        <TextField id="example-name" placeholder="Builder" aria-describedby="example-name-hint" />
      </FormField>
      <FormField label="Ошибка" htmlFor="example-error" error="Этот ник занят">
        <TextField
          id="example-error"
          defaultValue="Taken"
          invalid
          aria-describedby="example-error-error"
        />
      </FormField>
      <FormField label="Отключённое поле" htmlFor="example-disabled">
        <TextField id="example-disabled" disabled defaultValue="Недоступно" />
      </FormField>
      <FormField label="Пароль" htmlFor="example-password">
        <PasswordField id="example-password" autoComplete="new-password" />
      </FormField>
      <FormField label="Описание" htmlFor="example-description">
        <Textarea id="example-description" rows={4} />
      </FormField>
      <FormField label="Модель" htmlFor="example-model">
        <Select id="example-model">
          <option>Classic</option>
          <option>Slim</option>
        </Select>
      </FormField>
      <Checkbox label="Получать уведомления" />
      <Checkbox label="Недоступный выбор" disabled />
    </Card>
  );
}
function Feedback(): ReactElement {
  return (
    <Card>
      <Alert>Информация о состоянии</Alert>
      <Alert tone="success">Изменения сохранены</Alert>
      <Alert tone="danger">Ошибка сохранения</Alert>
      <Badge>Черновик</Badge>
      <Badge tone="success">Опубликовано</Badge>
      <Badge tone="warning">Приостановлен</Badge>
      <Badge tone="danger">Заблокирован</Badge>
      <Badge tone="info">Редактор</Badge>
      <Skeleton />
      <Spinner />
      <EmptyState title="Здесь пока нет публикаций">
        Опубликованные истории появятся в этом разделе.
      </EmptyState>
      <Avatar name="Алиса" />
      <MinecraftAvatar name="Builder" />
    </Card>
  );
}
function Article(): ReactElement {
  return (
    <Card>
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Летопись' }]} />
      <MarkdownContent html="<h2>Город на берегу</h2><p>Первая <strong>история</strong> сообщества.</p><blockquote>Мир помнит решения игроков.</blockquote><ul><li>Дом</li><li>Мост</li></ul><pre><code>/help</code></pre><table><thead><tr><th>Раздел</th><th>Состояние</th></tr></thead><tbody><tr><td>История</td><td>Опубликована</td></tr></tbody></table>" />
      <Table>
        <caption>Редакторские публикации</caption>
        <thead>
          <tr>
            <th scope="col">Название</th>
            <th scope="col">Статус</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Город на берегу</td>
            <td>
              <Badge tone="success">Опубликовано</Badge>
            </td>
          </tr>
        </tbody>
      </Table>
    </Card>
  );
}
function ToastExample(): ReactElement {
  const manager = useToast();
  const handleNotify = useCallback((): void => {
    manager.add({ title: 'Сохранено', description: 'Профиль обновлён' });
  }, [manager]);
  return <Button onClick={handleNotify}>Показать уведомление</Button>;
}
function choose(): void {
  /* Story interaction has no external side effect. */
}
function Overlays(): ReactElement {
  return (
    <Card>
      <Dialog
        trigger="Открыть диалог"
        title="Сохранить изменения?"
        description="Диалог удерживает фокус и закрывается по Escape."
      >
        <p>Перейти к новому облику.</p>
      </Dialog>
      <Tooltip content="Скопировать постоянный UUID">ⓘ Информация</Tooltip>
      <DropdownMenu
        trigger="Действия"
        items={[
          { id: 'profile', label: 'Профиль', handleSelect: choose },
          { id: 'disabled', label: 'Недоступно', disabled: true, handleSelect: choose },
        ]}
      />
      <Tabs
        items={[
          { id: 'write', label: 'Markdown', content: 'Редактор Markdown' },
          { id: 'preview', label: 'Предпросмотр', content: 'Санитизированная публикация' },
        ]}
      />
      <ToastProvider>
        <ToastExample />
      </ToastProvider>
    </Card>
  );
}
const meta = {
  title: 'Atria/Foundation',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta;
type Story = StoryObj<typeof meta>;
const FormStates: Story = { render: Forms };
const StatusAndEmptyStates: Story = { render: Feedback };
const MarkdownAndTables: Story = { render: Article };
const AccessibleOverlays: Story = { render: Overlays };
export default meta;
export { FormStates, StatusAndEmptyStates, MarkdownAndTables, AccessibleOverlays };
