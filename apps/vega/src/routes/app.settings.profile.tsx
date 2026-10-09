import { createFileRoute } from '@tanstack/react-router';
import { ProfileSettings } from '../profile-settings';

export const Route = createFileRoute('/app/settings/profile')({ component: ProfileSettings });
