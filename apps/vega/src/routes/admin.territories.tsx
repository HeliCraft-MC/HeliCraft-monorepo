import { createFileRoute, redirect } from '@tanstack/react-router';
import { SpatialAdministration } from '../spatial/admin-page';

const Route = createFileRoute('/admin/territories')({
  beforeLoad: ({ context }) => {
    if (!context.principal.permissions.includes('states.manage')) {
      throw redirect({ to: '/admin' });
    }
  },
  component: SpatialAdministration,
});
export { Route };
