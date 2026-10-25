import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs } from './tabs';

const meta = {
  title: 'Navigation/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  args: {
    label: 'Charter sections',
    items: [
      { id: 'offices', label: 'Offices', content: 'Define seats and appointment procedures.' },
      {
        id: 'authority',
        label: 'Authority policies',
        content: 'Only explicitly granted authority is available.',
      },
      { id: 'voting', label: 'Voting', content: 'Review quorum, thresholds and completion rules.' },
      { id: 'disabled', label: 'Unavailable', content: '', disabled: true },
    ],
  },
  parameters: {
    docs: {
      description: {
        component:
          'Use for related views within one task, not primary page navigation. Supply unique IDs, translated labels and host-owned content; defaultValue chooses the initial panel. Arrows move focus and Enter/Space activate. Disabled tabs cannot activate. Wide labels scroll locally on small screens; inactive panels unmount, so keep persistent draft values in the host.',
      },
    },
  },
} satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Mobile: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } };
