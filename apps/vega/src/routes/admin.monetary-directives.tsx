import { createFileRoute } from '@tanstack/react-router';
import { AdminMonetaryDirectives } from '../monetary/admin-directives';

const Route = createFileRoute('/admin/monetary-directives')({ component: AdminMonetaryDirectives });
export { Route };
