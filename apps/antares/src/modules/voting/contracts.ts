// oxlint-disable no-magic-numbers -- Public voting contract limits.
import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';
import { VotingRulesSchema } from './rules';

const ElectorateSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('GLOBAL_USERS') }),
  z.object({ type: z.literal('SPECIFIC_USERS'), userIds: z.array(z.uuid()).min(1).max(10_000) }),
  z.object({ type: z.literal('STATE_CITIZENS'), stateId: z.uuid() }),
  z.object({
    type: z.literal('OFFICE_HOLDERS'),
    stateId: z.uuid(),
    officeIds: z.array(z.uuid()).min(1).max(100),
  }),
]);
const VotingInputSchema = z
  .object({
    title: LocalizedInputSchema,
    description: LocalizedInputSchema,
    options: z
      .array(z.object({ id: z.uuid(), label: LocalizedInputSchema }))
      .min(2)
      .max(50),
    opensAt: z.iso.datetime(),
    closesAt: z.iso.datetime(),
    electorate: ElectorateSchema,
    rules: VotingRulesSchema,
    resultVisibility: z.enum(['PUBLIC', 'AFTER_CLOSE', 'ELIGIBLE_ONLY']),
    maxSelections: z.number().int().min(1).max(50),
  })
  .openapi('VotingInput');
const VotingStatusSchema = z.enum(['DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED']);
const VotingResultSchema = z
  .object({
    eligible: z.number(),
    participating: z.number(),
    abstentions: z.number(),
    quorumMet: z.boolean(),
    options: z.array(z.object({ id: z.uuid(), votes: z.number(), approved: z.boolean() })),
  })
  .openapi('VotingResult');
const VotingSubjectSchema = z
  .object({ type: z.string().max(80), id: z.uuid(), version: z.number().int().min(1) })
  .openapi('VotingSubject');
const VotingDetailSchema = z
  .object({
    id: z.uuid(),
    status: VotingStatusSchema,
    input: VotingInputSchema,
    eligible: z.boolean(),
    hasVoted: z.boolean(),
    result: VotingResultSchema.nullable(),
    governanceRevisionId: z.uuid().nullable(),
    subject: VotingSubjectSchema.nullable().openapi('OptionalVotingSubject'),
  })
  .openapi('VotingDetail');
type VotingInput = z.infer<typeof VotingInputSchema>;
type VotingResult = z.infer<typeof VotingResultSchema>;
type VotingSubject = z.infer<typeof VotingSubjectSchema>;
type VotingDetail = z.infer<typeof VotingDetailSchema>;
export {
  VotingInputSchema,
  VotingStatusSchema,
  VotingResultSchema,
  VotingDetailSchema,
  ElectorateSchema,
  type VotingInput,
  type VotingResult,
  type VotingDetail,
  type VotingSubject,
};
