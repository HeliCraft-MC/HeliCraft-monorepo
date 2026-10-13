import { createFileRoute } from '@tanstack/react-router';
import { VotingsPage } from '../states/votings';

const Route = createFileRoute('/app/votings')({ component: VotingsPage });
export { Route };
