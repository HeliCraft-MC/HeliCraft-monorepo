import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';

const meta = {
  title: 'Atria/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Hello, HeliCraft!' },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {};
export const Quiet: Story = { args: { tone: 'quiet' } };
export const Disabled: Story = { args: { disabled: true } };
