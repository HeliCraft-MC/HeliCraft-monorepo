import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { CompanyApplicationPage } from '../companies/application-page';

const api = getRouteApi('/app/companies/applications/$id');
function Page(): ReactElement {
  const { id } = api.useParams();
  const { principal } = api.useRouteContext();
  return <CompanyApplicationPage id={id} actorId={principal.id} />;
}
const Route = createFileRoute('/app/companies/applications/$id')({ component: Page });
export { Route };
