import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from './components/Alert/alert';
import { Badge, Card, EmptyState, Skeleton, Spinner } from './components/Feedback/feedback';

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
    </Card>
  );
}
const meta = {
  title: 'Feedback/Status states',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Use factual loading, empty, success and failure states. Empty content explains the next action; an error must not look like an empty list.',
      },
    },
  },
} satisfies Meta;
type Story = StoryObj<typeof meta>;
export const Overview: Story = { render: Feedback };
export default meta;
