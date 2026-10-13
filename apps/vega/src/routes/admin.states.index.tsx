import { createFileRoute } from '@tanstack/react-router';
import { AdminStates } from '../states/admin-list';

const Route = createFileRoute('/admin/states/')({ component: AdminStates });
export { Route };
