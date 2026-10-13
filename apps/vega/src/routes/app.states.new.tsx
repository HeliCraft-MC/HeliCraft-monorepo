import { createFileRoute } from '@tanstack/react-router';
import { StateDraftsList } from '../states/drafts-list';

const Route = createFileRoute('/app/states/new')({ component: StateDraftsList });
export { Route };
