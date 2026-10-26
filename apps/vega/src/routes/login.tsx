import { brandText, DEFAULT_SERVER_NAME } from '../site-branding';
import { loadPublicSite } from '../public-data';
import { translate } from '../locales';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { AuthPage } from '../auth-page';
import { currentAccount, safeReturn } from '../account-api';

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  beforeLoad: async ({ search, location }) => {
    if (typeof document === 'undefined') {
      return;
    }
    let authenticated = false;
    try {
      await currentAccount();
      authenticated = true;
    } catch {
      authenticated = false;
    }
    if (authenticated) {
      throw redirect({
        href: `${safeReturn(search.returnTo)}${location.hash ? `#${location.hash}` : ''}`,
      });
    }
  },
  loader: async () => await loadPublicSite(),
  head: ({ match, loaderData }) => ({
    meta: [
      {
        title: brandText(
          translate('seo.login.title', match.context.locale),
          loaderData?.serverName ?? DEFAULT_SERVER_NAME,
        ),
      },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AuthPage,
});
