import { createFileRoute, redirect } from '@tanstack/react-router';

const Route = createFileRoute('/admin/central-banks')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/institutions', search: { institution: 'bank' } });
  },
});
export { Route };
