import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { AdminInstitutions } from '../admin-institutions';

const Route = createFileRoute('/admin/institutions')({
  // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/prefer-top-level-await -- Zod catch supplies a search-schema default.
  validateSearch: z.object({ institution: z.enum(['bank', 'tax']).catch('bank') }),
  beforeLoad: ({ context }) => {
    if (!context.principal.permissions.includes('states.manage')) {
      throw redirect({ to: '/admin' });
    }
  },
  component: AdminInstitutions,
});
export { Route };
