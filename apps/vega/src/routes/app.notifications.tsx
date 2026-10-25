import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { CompanyInboxPage } from '../companies/inbox';

const api = getRouteApi('/app/notifications');
function Page(): ReactElement {
  const { principal } = api.useRouteContext();
  return <CompanyInboxPage actorId={principal.id} />;
}
const Route = createFileRoute('/app/notifications')({ component: Page });
export { Route };
