import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { RegistrationPage } from '../registration-page';
import { loadPublicSite } from '../public-data';
import { currentAccount } from '../account-api';

export const Route = createFileRoute('/register')({
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
  loader: async () => await loadPublicSite(),
  head: () => ({
    meta: [{ title: 'Регистрация · HeliCraft' }, { name: 'robots', content: 'noindex, nofollow' }],
  }),
  component: RegistrationPage,
});
