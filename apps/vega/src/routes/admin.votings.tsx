import { createFileRoute } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { VotingsPage } from '../states/votings';

function Page(): ReactElement {
  return <VotingsPage admin />;
}
const Route = createFileRoute('/admin/votings')({ component: Page });
export { Route };
