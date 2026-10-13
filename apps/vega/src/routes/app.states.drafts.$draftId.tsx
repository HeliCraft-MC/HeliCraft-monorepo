import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { StateDraftPage } from '../states/draft-page';

const routeApi = getRouteApi('/app/states/drafts/$draftId');
function Page(): ReactElement {
  const { draftId } = routeApi.useParams();
  const { principal } = routeApi.useRouteContext();
  return <StateDraftPage id={draftId} principal={principal} />;
}
const Route = createFileRoute('/app/states/drafts/$draftId')({ component: Page });
export { Route };
