import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { z } from 'zod';
import type { ReactElement } from 'react';
import { StateManagementPanel } from '../states/management-panel';
import { MANAGEMENT_SECTIONS } from '../states/management-sections';

const route = getRouteApi('/app/states_/$stateId/manage');
function Page(): ReactElement {
  const { stateId } = route.useParams();
  const { section } = route.useSearch();
  const { principal } = route.useRouteContext();
  return <StateManagementPanel stateId={stateId} actorId={principal.id} section={section} />;
}
const Route = createFileRoute('/app/states_/$stateId/manage')({
  // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/prefer-top-level-await -- Zod catch supplies a search-schema default, not a Promise callback.
  validateSearch: z.object({ section: z.enum(MANAGEMENT_SECTIONS).catch('overview') }),
  component: Page,
});
export { Route };
