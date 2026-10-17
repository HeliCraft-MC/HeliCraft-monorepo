import { z } from '@hono/zod-openapi';
import { OfficeSchema } from './contracts';
import { LocalizedInputSchema } from '../localized-content/contracts';

const OfficeAssignmentInputSchema = z
  .object({
    officeId: z.uuid(),
    userId: z.uuid(),
    kind: z.enum(['APPOINT', 'REMOVE']),
    replacedUserId: z.uuid().nullable().default(null),
  })
  .openapi('OfficeAssignmentInput');
const PersonSchema = z.object({ id: z.uuid(), name: z.string() });
const OfficeAssignmentDetailSchema = z
  .object({
    id: z.uuid(),
    stateId: z.uuid(),
    governanceRevisionId: z.uuid(),
    kind: z.enum(['APPOINT', 'REMOVE']),
    state: z.object({
      id: z.uuid(),
      slug: z.string(),
      name: LocalizedInputSchema,
      color: z.string(),
    }),
    office: OfficeSchema,
    person: PersonSchema,
    replacedPerson: PersonSchema.nullable(),
    createdBy: PersonSchema,
    status: z.enum(['PENDING', 'APPLIED', 'CANCELLED']),
    createdAt: z.iso.datetime(),
    blockedReason: z.string().nullable(),
    stale: z.boolean(),
    manualRequired: z.boolean(),
    manualProcedures: z.array(LocalizedInputSchema),
    ready: z.boolean(),
    canApply: z.boolean(),
    canCancel: z.boolean(),
    approvalGroups: z.array(
      z.object({ mode: z.enum(['ANY', 'ALL']), officeIds: z.array(z.uuid()) }),
    ),
    approvals: z.array(z.object({ officeId: z.uuid(), actor: PersonSchema, current: z.boolean() })),
    approvalOffices: z.array(
      z.object({ id: z.uuid(), name: LocalizedInputSchema, canApprove: z.boolean() }),
    ),
    votes: z.array(
      z.object({
        id: z.uuid(),
        source: z.enum(['OFFICE', 'POLICY', 'REMOVAL_POLICY']),
        approved: z.boolean(),
      }),
    ),
  })
  .openapi('OfficeAssignmentDetail');
type OfficeAssignmentInput = z.infer<typeof OfficeAssignmentInputSchema>;
type OfficeAssignmentDetail = z.infer<typeof OfficeAssignmentDetailSchema>;
interface OfficeAssignmentActor {
  readonly id: string;
  readonly admin: boolean;
}
export {
  OfficeAssignmentInputSchema,
  OfficeAssignmentDetailSchema,
  type OfficeAssignmentInput,
  type OfficeAssignmentDetail,
  type OfficeAssignmentActor,
};
