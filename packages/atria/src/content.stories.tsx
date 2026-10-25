import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, Card } from './components/Feedback/feedback';
import { MarkdownContent } from './components/MarkdownContent/markdown-content';
import { Table } from './components/Table/table';
import { Breadcrumbs } from './components/Breadcrumbs/breadcrumbs';

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
const meta = {
  title: 'Data display/Documents and tables',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Readable documents and tabular data. Pass only sanitized HTML. Give tables captions and column headers; horizontal scrolling must stay inside the table on mobile.',
      },
    },
  },
} satisfies Meta;
type Story = StoryObj<typeof meta>;
export const Overview: Story = { render: Article };
export default meta;
