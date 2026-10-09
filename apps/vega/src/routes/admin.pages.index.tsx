import { createFileRoute } from '@tanstack/react-router';
import { ContentList } from '../content-list';

export const Route = createFileRoute('/admin/pages/')({ component: ContentList });
