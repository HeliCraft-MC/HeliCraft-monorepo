import { createFileRoute, redirect } from '@tanstack/react-router';
import { currentAccount } from '../account-api';
import { AccountLayout } from '../account-layout';

export const Route = createFileRoute('/app')({
  ssr: false,
  beforeLoad: async ({ location }) => {
    try {
      return { principal: await currentAccount() };
    } catch {
      throw redirect({ to: '/login', search: { returnTo: location.pathname } });
    }
  },
  head: () => ({
    meta: [{ title: 'Аккаунт · HeliCraft' }, { name: 'robots', content: 'noindex, nofollow' }],
  }),
  component: AccountLayout,
});
