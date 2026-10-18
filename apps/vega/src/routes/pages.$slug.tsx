import { localizeContent } from '../localized-content';
import { translate } from '../locales';
import { HTTP } from '../http-status';
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { loadContent } from '../content-data';
import { PublicContent } from '../public-content';
import { metadata } from '../metadata';

export const Route = createFileRoute('/pages/$slug')({
  loader: async ({ params }) => {
    const data = await loadContent({ data: { kind: 'PAGE', slug: params.slug } });
    if (data.status === HTTP.notFound) {
      throw notFound();
    }
    if (!data.content) {
      throw new Error('Контент временно недоступен');
    }
    const publishedSlug = data.content.document.slug;
    if (publishedSlug === 'rules' || publishedSlug === 'start') {
      throw redirect({ href: `/${publishedSlug}`, statusCode: 301 });
    }
    if (data.content.redirect) {
      throw redirect({ href: `/pages/${data.content.document.slug}`, statusCode: 301 });
    }
    return data;
  },
  head: ({ loaderData, match }) => {
    const original = loaderData?.content?.document;
    const localized = original ? localizeContent(original, match.context.locale) : undefined;
    return metadata({
      serverName: loaderData?.site?.serverName,
      locale: match.context.locale,
      title:
        localized?.seoTitle ??
        localized?.title ??
        translate('seo.publication.title', match.context.locale),
      description: localized?.seoDescription ?? localized?.description ?? '',
      path: `/pages/${localized?.slug ?? ''}`,
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    });
  },
  component: PublicContent,
});
