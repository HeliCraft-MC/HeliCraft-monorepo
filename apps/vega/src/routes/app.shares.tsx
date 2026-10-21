import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PersonalCompanyShares } from '../companies/personal-shares';

const api = getRouteApi('/app/shares');
function Page(): ReactElement {
  const { principal } = api.useRouteContext();
  return <PersonalCompanyShares actorId={principal.id} />;
}
const Route = createFileRoute('/app/shares')({ component: Page });
export { Route };
