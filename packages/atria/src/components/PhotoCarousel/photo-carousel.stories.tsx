import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhotoCarousel } from './photo-carousel';

const photo = {
  src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"%3E%3Cpath fill="%23505b51" d="M0 0h1600v900H0z"/%3E%3Cpath fill="%232d3e32" d="M0 600 500 200 900 600 1200 300 1600 600v300H0z"/%3E%3C/svg%3E',
  small: '',
  title: 'Схематичный пейзаж',
  alt: 'Условные горы',
  author: 'Explorer',
  href: '#detail',
};
const meta = {
  title: 'Atria/PhotoCarousel',
  component: PhotoCarousel,
  tags: ['autodocs'],
  args: {
    photos: [{ ...photo, small: photo.src }],
    children: <h1>Мир, который строят игроки.</h1>,
  },
} satisfies Meta<typeof PhotoCarousel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SinglePhoto: Story = {};
export const GalleryCaptions: Story = {
  args: {
    photos: [
      { ...photo, small: photo.src },
      {
        ...photo,
        src: `${photo.src}#second`,
        small: `${photo.src}#second`,
        title: 'Вторая фотография',
        href: '#second',
      },
    ],
  },
};
