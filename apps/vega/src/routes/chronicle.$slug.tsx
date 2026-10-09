import { HTTP } from '../http-status';
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { loadContent } from '../content-data';
import { PublicContent } from '../public-content';
import { metadata } from '../metadata';

export const Route = createFileRoute('/chronicle/$slug')({
  loader: async ({ params }) => {
    const data = await loadContent({ data: { kind: 'CHRONICLE', slug: params.slug } });
    if (data.status === HTTP.notFound) {
      throw notFound();
    }
    if (!data.content) {
      throw new Error('Контент временно недоступен');
    }
    if (data.content.redirect) {
      throw redirect({ href: `/chronicle/${data.content.document.slug}`, statusCode: 301 });
    }
    return data;
  },
  head: ({ loaderData }) =>
    metadata({
      article: loaderData?.content?.document,
      title:
        loaderData?.content?.document.seoTitle ??
        loaderData?.content?.document.title ??
        'Публикация',
      description:
        loaderData?.content?.document.seoDescription ??
        loaderData?.content?.document.description ??
        '',
      path: `/chronicle/${loaderData?.content?.document.slug ?? ''}`,
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: PublicContent,
});
