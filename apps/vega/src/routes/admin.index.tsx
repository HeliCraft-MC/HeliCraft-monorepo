import { createFileRoute } from '@tanstack/react-router';
import { AdminHome } from '../admin-home';

export const Route = createFileRoute('/admin/')({ component: AdminHome });
