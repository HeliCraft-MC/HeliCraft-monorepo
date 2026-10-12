import type { Meta, StoryObj } from '@storybook/react-vite';
import { GalleryTile } from './gallery-tile';

const image =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="500"%3E%3Cpath fill="%2336403b" d="M0 0h800v500H0z"/%3E%3Cpath fill="%235d7364" d="M0 350 200 100 450 400 600 180 800 350v150H0z"/%3E%3C/svg%3E';
const meta = {
  title: 'Atria/GalleryTile',
  component: GalleryTile,
  tags: ['autodocs'],
  args: {
    href: '#detail',
    image,
    alt: 'Схематичный горный пейзаж',
    title: 'Место, которое хочется запомнить',
    author: 'Explorer',
    date: '2026-10-10T12:00:00.000Z',
    width: 800,
    height: 500,
  },
} satisfies Meta<typeof GalleryTile>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Landscape: Story = {};
export const LongCaption: Story = {
  args: { title: 'Длинная история небольшого города на берегу Северного моря' },
};
