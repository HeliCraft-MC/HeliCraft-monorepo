import type { Meta, StoryObj } from '@storybook/react-vite';
import { StateCard } from './state-card';

const flag =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="90" height="60"%3E%3Cpath fill="%23585e48" d="M0 0h90v60H0z"/%3E%3Cpath fill="%23e1a15a" d="M0 25h90v10H0z"/%3E%3C/svg%3E';
const meta = {
  title: 'Atria/state-card',
  component: StateCard,
  tags: ['autodocs'],
  args: { name: 'Аврора', flag, government: 'Советская республика', citizens: 8 },
} satisfies Meta<typeof StateCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const FlagOnly: Story = {};
export const SmallState: Story = { args: { name: 'Лор', citizens: 1, government: undefined } };
export const LongName: Story = {
  args: { name: 'Содружество свободных городов Северного побережья', href: '#state' },
};
export const Photograph: Story = {
  args: {
    image:
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="500"%3E%3Cpath fill="%23394742" d="M0 0h800v500H0z"/%3E%3Cpath fill="%235e7166" d="M0 350 200 100 450 400 600 180 800 350v150H0z"/%3E%3C/svg%3E',
  },
};
export const Territory: Story = {
  args: {
    silhouette:
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Cpath fill="%23aaa79f" d="M20 70 85 20 170 60 185 120 140 170 80 180 25 130z"/%3E%3C/svg%3E',
  },
};

export const Detailed: Story = {
  args: {
    description: 'Граждане выбирают представителей и принимают общие законы.',
    facts: [
      { label: 'Решения', value: 'Голосование представителей' },
      { label: 'Основа', value: 'Конституция' },
    ],
  },
};
export const English: Story = {
  args: {
    name: 'Republic',
    government: 'Elected government',
    description: 'Citizens elect representatives and agree on shared laws.',
    flagLabel: 'Flag',
    populationLabel: 'citizens',
    facts: [{ label: 'Decisions', value: 'Representative voting' }],
  },
};

export const CustomFlagArtwork: Story = {
  args: {
    flag: (
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- An inline SVG flag needs an image role.
      <svg role="img" aria-label="Flag: Example" viewBox="0 0 40 20">
        <rect width="40" height="20" fill="#365b90" />
        <path d="M0 10h40" stroke="#e9c571" strokeWidth="4" />
      </svg>
    ),
    government: '2 offices',
    href: '#state',
  },
};
