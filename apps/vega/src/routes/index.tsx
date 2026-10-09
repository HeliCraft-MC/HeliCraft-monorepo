import type { ReactElement } from 'react';
import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { Home as HomeView } from '../home';
import { loadPublicHome } from '../public-data';
import { metadata } from '../metadata';

const homeRoute = getRouteApi('/');
function Home(): ReactElement {
  return <HomeView data={homeRoute.useLoaderData()} />;
}
const Route = createFileRoute('/')({
  loader: async () => await loadPublicHome(),
  head: ({ loaderData }) =>
    metadata({
      title: 'Мир, который помнит',
      description:
        'Постоянный Minecraft-мир, где у каждого дома и каждого решения есть продолжение. Начни свою историю в HeliCraft.',
      path: '/',
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: Home,
});

export { Route };
