import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoadingState } from './loading-state';

const meta = {
  title: 'Feedback/LoadingState',
  component: LoadingState,
  parameters: {
    docs: {
      description: {
        component:
          'Use for initial page or section requests to reserve content space. Use compact inside a persistent panel. Always supply a localized label. Reduced motion keeps a static ring and visible text.',
      },
    },
  },
  args: { label: 'Загрузка государства…' },
} satisfies Meta<typeof LoadingState>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Page: Story = {};
export const Compact: Story = { args: { compact: true } };
export const English: Story = { args: { label: 'Loading state…' } };
