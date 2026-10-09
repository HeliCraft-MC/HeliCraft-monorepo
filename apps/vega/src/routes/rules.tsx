import { HTTP } from '../http-status';
import { createFileRoute } from '@tanstack/react-router';
import { InfoPage } from '../info-page';
import { loadContent } from '../content-data';
import { metadata } from '../metadata';

export const Route = createFileRoute('/rules')({
  loader: async () => {
    const data = await loadContent({ data: { kind: 'PAGE', slug: 'rules' } });
    if (data.status !== HTTP.ok && data.status !== HTTP.notFound) {
      throw new Error('Страница временно недоступна');
    }
    return data;
  },
  head: ({ loaderData }) =>
    metadata({
      title:
        loaderData?.content?.document.seoTitle ?? loaderData?.content?.document.title ?? 'Правила',
      description:
        loaderData?.content?.document.seoDescription ??
        loaderData?.content?.document.description ??
        'Базовые правила веб-сообщества HeliCraft.',
      path: '/rules',
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: InfoPage,
});
