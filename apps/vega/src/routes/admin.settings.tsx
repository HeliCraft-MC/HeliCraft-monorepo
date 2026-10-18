import { createFileRoute, redirect } from '@tanstack/react-router';
import { SiteSettingsPage } from '../site-settings';

const Route = createFileRoute('/admin/settings')({
  beforeLoad: ({ context }) => {
    if (!context.principal.permissions.includes('site.manage')) {
      throw redirect({ to: '/admin' });
    }
  },
  component: SiteSettingsPage,
});
export { Route };
