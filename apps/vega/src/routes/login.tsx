import { translate } from '../locales';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { AuthPage } from '../auth-page';
import { currentAccount } from '../account-api';

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  beforeLoad: async () => {
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
      throw redirect({ to: '/app' });
    }
  },
  head: ({ match }) => ({
    meta: [
      { title: translate('seo.login.title', match.context.locale) },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AuthPage,
});
