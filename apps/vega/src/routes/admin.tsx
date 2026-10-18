import { brandText, DEFAULT_SERVER_NAME } from '../site-branding';
import { loadPublicSite } from '../public-data';
import { translate } from '../locales';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { currentAccount } from '../account-api';
import { AdminLayout } from '../admin-layout';

export const Route = createFileRoute('/admin')({
  ssr: false,
  loader: async () => await loadPublicSite(),
  beforeLoad: async ({ location }) => {
    let principal: Awaited<ReturnType<typeof currentAccount>> | null = null;
    try {
      principal = await currentAccount();
    } catch {
      throw redirect({ to: '/login', search: { returnTo: location.pathname } });
    }
    if (
      !principal.permissions.includes('content.read') &&
      !principal.permissions.includes('users.read')
    ) {
      throw redirect({ to: '/app' });
    }
    return { principal };
  },
  head: ({ match, loaderData }) => ({
    meta: [
      {
        title: brandText(
          translate('seo.admin.title', match.context.locale),
          loaderData?.serverName ?? DEFAULT_SERVER_NAME,
        ),
      },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AdminLayout,
});
