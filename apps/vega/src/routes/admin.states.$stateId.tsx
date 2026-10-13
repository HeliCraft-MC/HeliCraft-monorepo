import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { AdminStatePage } from '../states/admin';

const routeApi = getRouteApi('/admin/states/$stateId');
function Page(): ReactElement {
  const { stateId } = routeApi.useParams();
  const { principal } = routeApi.useRouteContext();
  return <AdminStatePage id={stateId} principal={principal} />;
}
const Route = createFileRoute('/admin/states/$stateId')({ component: Page });
export { Route };
