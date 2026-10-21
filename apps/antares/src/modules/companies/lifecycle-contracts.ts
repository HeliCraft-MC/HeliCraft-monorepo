import { z } from '@hono/zod-openapi';
import { CompanyStatusSchema } from './contracts';

const HISTORY_PAGE_SIZE = 20;
const CompanyStatusChangeSchema = z
  .object({
    previousStatus: z.enum(['ACTIVE', 'SUSPENDED']),
    status: z.enum(['ACTIVE', 'SUSPENDED']),
    // oxlint-disable-next-line no-magic-numbers -- Administrative reasons use the existing bounded audit-text convention.
    reason: z.string().trim().min(1).max(2000),
  })
  .strict();
const CompanyLifecycleEventSchema = z
  .object({
    id: z.uuid(),
    number: z.number().int(),
    previousStatus: CompanyStatusSchema,
    status: CompanyStatusSchema,
    actorId: z.uuid(),
    reason: z.string(),
    applicationId: z.uuid().nullable(),
    createdAt: z.iso.datetime(),
  })
  .openapi('CompanyLifecycleEvent');
const CompanyLifecyclePageSchema = z
  .object({
    items: z.array(CompanyLifecycleEventSchema),
    page: z.number().int(),
    hasMore: z.boolean(),
  })
  .openapi('CompanyLifecyclePage');
const CompanyManualQueueSchema = z
  .object({
    items: z.array(
      z.object({
        id: z.uuid(),
        companyId: z.uuid(),
        kind: z.string(),
        createdAt: z.iso.datetime(),
      }),
    ),
    page: z.number().int(),
    hasMore: z.boolean(),
  })
  .openapi('CompanyManualQueue');
type CompanyStatusChange = z.infer<typeof CompanyStatusChangeSchema>;
type CompanyLifecyclePage = z.infer<typeof CompanyLifecyclePageSchema>;
type CompanyManualQueue = z.infer<typeof CompanyManualQueueSchema>;
export {
  HISTORY_PAGE_SIZE,
  CompanyStatusChangeSchema,
  CompanyLifecyclePageSchema,
  CompanyManualQueueSchema,
  type CompanyStatusChange,
  type CompanyLifecyclePage,
  type CompanyManualQueue,
};
