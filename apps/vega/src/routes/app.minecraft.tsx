import { createFileRoute } from '@tanstack/react-router';
import { MinecraftPage } from '../minecraft-page';

export const Route = createFileRoute('/app/minecraft')({ component: MinecraftPage });
