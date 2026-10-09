import { HTTP } from '../http-status';
import { createFileRoute } from '@tanstack/react-router';
import { InfoPage } from '../info-page';
import { loadContent } from '../content-data';
import { metadata } from '../metadata';

export const Route = createFileRoute('/start')({
  loader: async () => {
    const data = await loadContent({ data: { kind: 'PAGE', slug: 'start' } });
    if (data.status !== HTTP.ok && data.status !== HTTP.notFound) {
      throw new Error('Страница временно недоступна');
    }
    return data;
  },
  head: ({ loaderData }) =>
    metadata({
      title:
        loaderData?.content?.document.seoTitle ??
        loaderData?.content?.document.title ??
        'Как начать',
      description:
        loaderData?.content?.document.seoDescription ??
        loaderData?.content?.document.description ??
        'Создай аккаунт HeliCraft, получи постоянный UUID и подготовь Minecraft.',
      path: '/start',
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: InfoPage,
});
