import { createFileRoute } from '@tanstack/react-router';
import { AccountPreferences } from '../account-preferences';

export const Route = createFileRoute('/app/settings/')({ component: AccountPreferences });
