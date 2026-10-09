import { createFileRoute } from '@tanstack/react-router';
import { UserList } from '../user-list';

export const Route = createFileRoute('/admin/users/')({ component: UserList });
