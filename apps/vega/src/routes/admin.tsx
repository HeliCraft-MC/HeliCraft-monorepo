import { createFileRoute, redirect } from '@tanstack/react-router';
import { currentAccount } from '../account-api';
import { AdminLayout } from '../admin-layout';

export const Route = createFileRoute('/admin')({
  ssr: false,
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
  head: () => ({
    meta: [
      { title: 'Администрация · HeliCraft' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AdminLayout,
});
