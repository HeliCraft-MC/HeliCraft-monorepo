import { createFileRoute } from '@tanstack/react-router';
import { InfoPage } from '../info-page';
import { loadPublicHome } from '../public-data';
import { metadata } from '../metadata';

export const Route = createFileRoute('/world')({
  loader: async () => await loadPublicHome(),
  head: ({ loaderData }) =>
    metadata({
      title: 'Мир HeliCraft',
      description: 'Постоянный Minecraft-мир для независимой игры, строительства и сообществ.',
      path: '/world',
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: InfoPage,
});
