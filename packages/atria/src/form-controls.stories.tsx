import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormField } from './components/FormField/form-field';
import { TextField } from './components/TextField/text-field';
import { PasswordField } from './components/PasswordField/password-field';
import { Textarea } from './components/Textarea/textarea';
import { Select } from './components/Select/select';
import { Checkbox } from './components/Checkbox/checkbox';
import { Card } from './components/Feedback/feedback';

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
const meta = {
  title: 'Forms/Control states',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Labelled text, password, multiline, select and checkbox controls. Keep labels visible; use hints for essential requirements and errors to explain how to recover.',
      },
    },
  },
} satisfies Meta;
type Story = StoryObj<typeof meta>;
export const Overview: Story = { render: Forms };
export default meta;
