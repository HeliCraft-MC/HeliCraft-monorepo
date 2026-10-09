import { createFileRoute } from '@tanstack/react-router';
import { AccountHome } from '../account-home';

export const Route = createFileRoute('/app/')({ component: AccountHome });
