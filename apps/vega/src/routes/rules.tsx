import { localizeContent } from '../localized-content';
import { translate } from '../locales';
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
  head: ({ loaderData, match }) => {
    const original = loaderData?.content?.document;
    const localized = original ? localizeContent(original, match.context.locale) : undefined;
    return metadata({
      locale: match.context.locale,
      title:
        localized?.seoTitle ??
        localized?.title ??
        translate('navigation.rules', match.context.locale),
      description:
        localized?.seoDescription ??
        localized?.description ??
        translate('seo.rules.description', match.context.locale),
      path: '/rules',
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    });
  },
  component: InfoPage,
});
