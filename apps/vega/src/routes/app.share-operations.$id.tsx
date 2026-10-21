import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { ShareOperationPage } from '../companies/share-operation-page';

const api = getRouteApi('/app/share-operations/$id');
function Page(): ReactElement {
  const { id } = api.useParams();
  const { principal } = api.useRouteContext();
  return <ShareOperationPage id={id} actorId={principal.id} />;
}
const Route = createFileRoute('/app/share-operations/$id')({ component: Page });
export { Route };
