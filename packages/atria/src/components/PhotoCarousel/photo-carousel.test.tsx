import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PhotoCarousel } from './photo-carousel';

const photos = [
  {
    src: '/first.webp',
    small: '/first-small.webp',
    title: 'Порт',
    author: 'Builder',
    alt: 'Причал',
    href: '/gallery/first',
  },
  {
    src: '/second.webp',
    small: '/second-small.webp',
    title: 'Город',
    author: 'Explorer',
    alt: 'Город',
    href: '/gallery/second',
  },
];
const fallback = [
  {
    src: '/archive.webp',
    small: '/archive-small.webp',
    title: 'Скриншот игроков HeliCraft',
    alt: 'Мир HeliCraft',
  },
];
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe('PhotoCarousel', () => {
  it('disables automatic rotation when reduced motion is requested', () => {
    vi.useFakeTimers();
    const media = globalThis.matchMedia('(prefers-reduced-motion: reduce)');
    Object.defineProperty(media, 'matches', { value: true });
    vi.spyOn(globalThis, 'matchMedia').mockReturnValue(media);
    render(
      <PhotoCarousel photos={photos}>
        <h1>Наш мир</h1>
      </PhotoCarousel>,
    );
    act(() => {
      vi.advanceTimersByTime(13_000);
    });
    expect(screen.getByRole('link', { name: 'Порт' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Город' })).not.toBeInTheDocument();
  });
  it('starts deterministically, advances by keyboard-compatible button and replaces failed image attribution', () => {
    const { container } = render(
      <PhotoCarousel photos={photos} fallbackPhotos={fallback}>
        <h1>Наш мир</h1>
      </PhotoCarousel>,
    );
    expect(screen.getByRole('link', { name: 'Порт' })).toHaveAttribute('href', '/gallery/first');
    fireEvent.click(screen.getByRole('button', { name: 'Следующая фотография' }));
    expect(screen.getByRole('link', { name: 'Город' })).toBeInTheDocument();
    const failedImage = container.querySelector('img[data-source="/second.webp"]');
    if (failedImage === null) {
      throw new Error('Missing carousel image');
    }
    fireEvent.error(failedImage);
    expect(screen.getByText('Скриншот игроков HeliCraft')).toBeInTheDocument();
    expect(screen.queryByText('Автор: Explorer')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Остановить смену фотографий' }));
    expect(screen.getByRole('button', { name: 'Продолжить смену фотографий' })).toBeInTheDocument();
  });
});
