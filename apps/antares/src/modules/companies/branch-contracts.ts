import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';

const MAX_REASON_LENGTH = 2000;
const BranchStatusSchema = z.enum(['PENDING_REGISTRATION', 'ACTIVE', 'REJECTED', 'CLOSED']);
const BranchApplicationStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SUPERSEDED',
  'CANCELLED',
]);
const BranchRegistrationSchema = z
  .object({
    kind: z.literal('REGISTER_BRANCH'),
    branchId: z.uuid(),
    stateId: z.uuid(),
    policyRevisionId: z.uuid(),
    name: LocalizedInputSchema,
    description: LocalizedInputSchema,
  })
  .strict();
const BranchCloseSchema = z
  .object({
    kind: z.literal('CLOSE_BRANCH'),
    branchId: z.uuid(),
    reason: z.string().trim().min(1).max(MAX_REASON_LENGTH),
  })
  .strict();
const BranchReviewSchema = z
  .object({
    kind: z.literal('REVIEW_COMPANY_BRANCH'),
    applicationId: z.uuid(),
    branchId: z.uuid(),
    decision: z.enum(['APPROVE', 'REJECT']),
    reason: z.string().trim().min(1).max(MAX_REASON_LENGTH),
  })
  .strict();
type BranchStatus = z.infer<typeof BranchStatusSchema>;
type BranchApplicationStatus = z.infer<typeof BranchApplicationStatusSchema>;
type BranchRegistration = z.infer<typeof BranchRegistrationSchema>;
type BranchClose = z.infer<typeof BranchCloseSchema>;
type BranchReview = z.infer<typeof BranchReviewSchema>;
export {
  BranchStatusSchema,
  BranchApplicationStatusSchema,
  BranchRegistrationSchema,
  BranchCloseSchema,
  BranchReviewSchema,
  type BranchStatus,
  type BranchApplicationStatus,
  type BranchRegistration,
  type BranchClose,
  type BranchReview,
};
