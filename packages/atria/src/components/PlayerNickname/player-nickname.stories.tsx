import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlayerNickname } from './player-nickname';

const meta = {
  title: 'Atria/PlayerNickname',
  component: PlayerNickname,
  args: { name: 'Builder' },
} satisfies Meta<typeof PlayerNickname>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Fallback: Story = {};
export const LongNickname: Story = { args: { name: 'LongPlayerName', size: 32 } };
export const LoadedHead: Story = {
  args: {
    headUrl:
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="8" height="8"%3E%3Cpath fill="%23855438" d="M0 0h8v8H0z"/%3E%3Cpath fill="%23d9ad7c" d="M1 2h6v5H1z"/%3E%3Cpath fill="%23383e49" d="M1 3h2v1H1zM5 3h2v1H5zM3 6h2v1H3z"/%3E%3C/svg%3E',
  },
};

export const ProfileLink: Story = {
  args: { href: '/players/00000000-0000-4000-8000-000000000001' },
};
