import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { CompanyDraftsList } from '../companies/drafts-list';

const api = getRouteApi('/app/companies/');
function Page(): ReactElement {
  const { principal } = api.useRouteContext();
  return <CompanyDraftsList actorId={principal.id} />;
}
const Route = createFileRoute('/app/companies/')({ component: Page });
export { Route };
