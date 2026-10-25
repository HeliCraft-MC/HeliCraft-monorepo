import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { z } from 'zod';
import type { ReactElement } from 'react';
import { VotingsPage } from '../states/votings';

const route = getRouteApi('/admin/votings');
function Page(): ReactElement {
  const { votingId } = route.useSearch();
  return <VotingsPage admin votingId={votingId} />;
}
const Route = createFileRoute('/admin/votings')({
  validateSearch: z.object({ votingId: z.uuid().optional() }),
  component: Page,
});
export { Route };
