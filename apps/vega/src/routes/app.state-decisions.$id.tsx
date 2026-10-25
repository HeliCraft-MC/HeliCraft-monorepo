import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { StateDecisionPage } from '../companies/state-decision-page';

const api = getRouteApi('/app/state-decisions/$id');
function Page(): ReactElement {
  const { id } = api.useParams();
  const { principal } = api.useRouteContext();
  return <StateDecisionPage id={id} actorId={principal.id} />;
}
const Route = createFileRoute('/app/state-decisions/$id')({ component: Page });
export { Route };
