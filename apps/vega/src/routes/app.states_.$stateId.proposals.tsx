import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { StateProposalsPage } from '../states/proposals-page';

const route = getRouteApi('/app/states_/$stateId/proposals');
function Page(): ReactElement {
  const { stateId } = route.useParams();
  const { principal } = route.useRouteContext();
  return <StateProposalsPage stateId={stateId} actorId={principal.id} />;
}
const Route = createFileRoute('/app/states_/$stateId/proposals')({ component: Page });
export { Route };
