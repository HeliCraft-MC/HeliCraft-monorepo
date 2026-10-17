import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { VotingCard } from '../states/voting-card';

const route = getRouteApi('/app/votings_/$votingId');
function Page(): ReactElement {
  const { votingId } = route.useParams();
  return <VotingCard id={votingId} admin={false} />;
}
const Route = createFileRoute('/app/votings_/$votingId')({ component: Page });
export { Route };
