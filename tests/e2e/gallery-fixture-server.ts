// oxlint-disable no-magic-numbers -- HTTP statuses and fixed gallery fixtures exist only in this browser test process.
import { createApp } from '../../apps/antares/src/app';
import type { GalleryItem } from '../../packages/alhena/src';

const root = 'apps/vega/public';
const pictures = ['skyline', 'town', 'castle', 'forest', 'night', 'town'];
const items: GalleryItem[] = Array.from({ length: 24 }, (_value, index) => ({
  id: `11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`,
  title:
    [
      'Вечер над городом',
      'Улицы нашего мира',
      'Замок у реки',
      'Лесные тропы',
      'Ночной город',
      'Дом на площади',
    ][index] ?? `Тестовый снимок ${index + 1}`,
  originalLanguage: 'ru',
  translations: {
    en: {
      title: 'Evening over the town',
      alt: 'Player buildings and Minecraft scenery',
      description: 'English photograph description',
    },
  },
  alt: 'Постройки игроков и пейзажи Minecraft',
  description: 'Тестовая фотография для проверки публичного SSR.',
  place: 'Тестовое место',
  location: { x: 100, y: 64, z: -200, dimension: 'overworld' },
  players: [],
  author: { id: '22222222-2222-4222-8222-222222222222', name: 'TestPhotographer' },
  createdAt: '2026-10-10T12:00:00.000Z',
  width: 1600,
  height: 900,
  imageUrl: `/world/${pictures[index % pictures.length] ?? 'town'}.webp`,
  thumbnailUrl: `/world/${pictures[index % pictures.length] ?? 'town'}-small.webp`,
}));
let total = 0;
let failed = false;
let observedCookie: string | null = null;
const app = createApp({
  siteOrigin: 'http://localhost:5185',
  checkReady: async (): Promise<void> => {
    await Promise.resolve();
  },
});
function publicGallery(url: URL): Response {
  const page = Number(url.searchParams.get('page') ?? 1);
  const size = Number(url.searchParams.get('pageSize') ?? 18);
  return failed
    ? Response.json({ message: 'Test outage' }, { status: 503 })
    : Response.json({ items: items.slice(0, total).slice((page - 1) * size, page * size), total });
}
Bun.serve({
  hostname: '127.0.0.1',
  port: 3115,
  async fetch(request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/__test/observed') {
      return Response.json({ observedCookie });
    }
    if (url.pathname === '/__test/gallery') {
      observedCookie = null;
      total = Number(url.searchParams.get('count') ?? 0);
      failed = url.searchParams.get('failed') === 'true';
      return Response.json({ total, failed });
    }
    if (url.pathname === '/api/v1/public/pages') {
      return Response.json({ items: [], total: 0 });
    }
    if (url.pathname === '/api/v1/public/gallery') {
      observedCookie = request.headers.get('cookie');
      return publicGallery(url);
    }
    if (url.pathname.startsWith('/api/v1/public/gallery/')) {
      const item = items
        .slice(0, total)
        .find((candidate) => candidate.id === url.pathname.split('/').at(-1));
      return item && !failed
        ? Response.json(item)
        : Response.json({ message: 'Not found' }, { status: 404 });
    }
    if (url.pathname.startsWith('/world/')) {
      return new Response(Bun.file(root + url.pathname));
    }
    return await app.fetch(request);
  },
});
