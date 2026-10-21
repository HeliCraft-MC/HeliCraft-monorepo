import { createFileRoute, getRouteApi, redirect } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { z } from 'zod';
import { AdminCompaniesPage } from '../companies/admin-page';

const api = getRouteApi('/admin/companies');
const MAX_SEARCH = 100;
const search = z.object({
  companyId: z.uuid().optional(),
  search: z.string().trim().max(MAX_SEARCH).default(''),
});
function Page(): ReactElement {
  const { companyId, search: query } = api.useSearch();
  const { principal } = api.useRouteContext();
  return <AdminCompaniesPage actorId={principal.id} companyId={companyId} search={query} />;
}
const Route = createFileRoute('/admin/companies')({
  validateSearch: search,
  beforeLoad: ({ context }) => {
    if (!context.principal.permissions.includes('states.manage')) {
      throw redirect({ to: '/admin' });
    }
  },
  component: Page,
});
export { Route };
