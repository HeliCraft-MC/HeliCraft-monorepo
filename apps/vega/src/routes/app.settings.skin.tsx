import { createFileRoute } from '@tanstack/react-router';
import { SkinSettings } from '../skin-settings';

export const Route = createFileRoute('/app/settings/skin')({ component: SkinSettings });
