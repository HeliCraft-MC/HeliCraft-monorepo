import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Home } from '../src/home';
import { archivePhotos, homePhotos } from '../src/home-data';
import type { HomeData } from '../src/home-data';
import type { GalleryItem } from '@helicraft/alhena';

const homeData: HomeData = {
  site: {
    phase: 'PRELAUNCH',
    registrationEnabled: false,
    minecraftAddress: null,
    canonicalOrigin: 'https://helicraft.test',
    links: [],
  },
  gallery: null,
};
const item: GalleryItem = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Порт',
  description: 'Новый причал',
  alt: 'Деревянный причал у воды',
  place: 'Побережье',
  location: null,
  author: { id: '22222222-2222-4222-8222-222222222222', name: 'Builder' },
  players: [],
  width: 1600,
  height: 900,
  createdAt: '2026-10-10T12:00:00.000Z',
  imageUrl: '/image',
  thumbnailUrl: '/thumbnail',
};
describe('public home', () => {
  it.each([null, { total: 0, items: [] }, { total: 5, items: [item] }])(
    'uses archive photographs until there are more than five public records: %j',
    (gallery) => {
      expect(homePhotos(gallery)).toBe(archivePhotos);
    },
  );
  it('uses bounded gallery records and retains their captions, authors and detail links', () => {
    expect(homePhotos({ total: 6, items: [item] })[0]).toMatchObject({
      title: 'Порт',
      author: 'Builder',
      place: 'Побережье',
      href: `/gallery/${item.id}`,
    });
  });
  it('renders clearly labelled editorial examples without a prelaunch address', () => {
    render(<Home data={homeData} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Minecraft, где');
    expect(
      screen.getByText(
        'Примеры форм правления: у каждого сообщества свои законы и порядок участия.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Базальт' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Северный путь' })).toBeInTheDocument();
    expect(screen.getByText('Демонстрационные данные')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Компании, государства, численность и курсы валют в этом примере вымышлены.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/ещё|скоро|284-й/u)).not.toBeInTheDocument();
    expect(screen.queryByText(/онлайн/u)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Скопировать адрес сервера' }),
    ).not.toBeInTheDocument();
  });
});
