import { createFileRoute } from '@tanstack/react-router';
import { ContentEditor } from '../content-editor';

export const Route = createFileRoute('/admin/chronicle/$entryId')({ component: ContentEditor });
