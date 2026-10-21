import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { CompanyDecisionPage } from '../companies/decision-page';

const api = getRouteApi('/app/company-decisions/$id');
function Page(): ReactElement {
  const { id } = api.useParams();
  const { principal } = api.useRouteContext();
  return <CompanyDecisionPage id={id} actorId={principal.id} />;
}
const Route = createFileRoute('/app/company-decisions/$id')({ component: Page });
export { Route };
