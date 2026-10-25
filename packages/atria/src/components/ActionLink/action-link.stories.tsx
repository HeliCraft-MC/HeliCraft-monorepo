import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from '../icon';
import { ActionLink } from './action-link';

const meta = {
  title: 'Actions/ActionLink',
  component: ActionLink,
  tags: ['autodocs'],
  args: {
    href: '#destination',
    children: (
      <>
        Исследовать мир <Icon name="arrowUpRight" />
      </>
    ),
  },
} satisfies Meta<typeof ActionLink>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {};
export const Quiet: Story = { args: { tone: 'quiet' } };
