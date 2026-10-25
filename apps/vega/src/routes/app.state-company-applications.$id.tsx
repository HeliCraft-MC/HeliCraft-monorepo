import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { StateRegistrationPage } from '../companies/state-registration-page';

const api = getRouteApi('/app/state-company-applications/$id');
function Page(): ReactElement {
  const { id } = api.useParams();
  const { principal } = api.useRouteContext();
  return <StateRegistrationPage id={id} actorId={principal.id} />;
}
const Route = createFileRoute('/app/state-company-applications/$id')({ component: Page });
export { Route };
