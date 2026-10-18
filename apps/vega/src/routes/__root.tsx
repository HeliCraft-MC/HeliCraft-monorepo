import { DEFAULT_SERVER_NAME } from '../site-branding';
import { isLocale } from '../locales';
import { loadLocale } from '../locale-server';
import { ErrorPage } from '../error-page';
import type { Locale } from '../locales';
import { createRootRouteWithContext } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { SiteLayout } from '../site-layout';
import { RootDocument } from '../root-document';
import { MissingPage } from '../missing-page';
import { loadPublicNavigation } from '../public-data';

interface RouterContext {
  readonly queryClient: QueryClient;
  readonly locale?: Locale;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: (input: Record<string, unknown>): { lang?: Locale } =>
    isLocale(input.lang) ? { lang: input.lang } : {},
  beforeLoad: async ({ location }) => ({
    locale: await loadLocale({ data: new URLSearchParams(location.searchStr).get('lang') }),
  }),
  errorComponent: ErrorPage,
  loader: async () => await loadPublicNavigation(),
  head: ({ loaderData }) => ({
    meta: [
      { charSet: 'utf8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: loaderData?.site?.serverName ?? DEFAULT_SERVER_NAME },
    ],
    links: [
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', href: loaderData?.site?.logoUrl ?? '/world/logo.png' },
    ],
  }),
  shellComponent: RootDocument,
  component: SiteLayout,
  notFoundComponent: MissingPage,
});
