import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from './avatar';
import { MinecraftAvatar } from '../MinecraftAvatar/minecraft-avatar';

const meta = {
  title: 'Identity/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  args: { name: 'Example player' },
  parameters: {
    docs: {
      description: {
        component:
          'Show a supplied identity image or a readable initial when no image is available or loading fails. Supply the actual display name; images retain accessible alternative text. MinecraftAvatar accepts a cropped head URL and an optional size, never an entire skin texture. Neither component fetches identity or implies online status. Use PlayerNickname for a linked identity with preview.',
      },
    },
  },
} satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Fallback: Story = {};
export const LongName: Story = {
  args: { name: 'A player with a deliberately long translated name' },
};
export const MinecraftFallback: Story = { render: () => <MinecraftAvatar name="Example player" /> };
