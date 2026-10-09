import { createRootRouteWithContext } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { SiteLayout } from '../site-layout';
import { RootDocument } from '../root-document';
import { MissingPage } from '../missing-page';
import { loadPublicNavigation } from '../public-data';

interface RouterContext {
  readonly queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: async () => await loadPublicNavigation(),
  head: () => ({
    meta: [
      { charSet: 'utf8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'HeliCraft — мир, который помнит' },
    ],
    links: [{ rel: 'manifest', href: '/manifest.webmanifest' }],
  }),
  shellComponent: RootDocument,
  component: SiteLayout,
  notFoundComponent: MissingPage,
});
