import { createFileRoute } from '@tanstack/react-router';
import { SecuritySettings } from '../security-settings';

export const Route = createFileRoute('/app/settings/security')({ component: SecuritySettings });
