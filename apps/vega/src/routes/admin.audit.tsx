import { z } from 'zod';
import { createFileRoute } from '@tanstack/react-router';
import { AuditList } from '../audit-list';

export const Route = createFileRoute('/admin/audit')({
  validateSearch: z.object({ target: z.uuid().optional() }),
  component: AuditList,
});
