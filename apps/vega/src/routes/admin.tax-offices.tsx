import { createFileRoute, redirect } from '@tanstack/react-router';

const Route = createFileRoute('/admin/tax-offices')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/institutions', search: { institution: 'tax' } });
  },
});
export { Route };
