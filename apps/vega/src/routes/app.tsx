import { brandText, DEFAULT_SERVER_NAME } from '../site-branding';
import { loadPublicSite } from '../public-data';
import { translate } from '../locales';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { currentAccount } from '../account-api';
import { AccountLayout } from '../account-layout';

export const Route = createFileRoute('/app')({
  ssr: false,
  loader: async () => await loadPublicSite(),
  beforeLoad: async ({ location }) => {
    try {
      return { principal: await currentAccount() };
    } catch {
      throw redirect({ to: '/login', search: { returnTo: location.href } });
    }
  },
  head: ({ match, loaderData }) => ({
    meta: [
      {
        title: brandText(
          translate('seo.account.title', match.context.locale),
          loaderData?.serverName ?? DEFAULT_SERVER_NAME,
        ),
      },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AccountLayout,
});
