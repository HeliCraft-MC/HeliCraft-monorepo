import { createFileRoute } from '@tanstack/react-router';
import { UserDetails } from '../user-details';

export const Route = createFileRoute('/admin/users/$userId')({ component: UserDetails });
