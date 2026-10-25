// oxlint-disable no-magic-numbers -- Voting duration and percentage bounds are public contract limits.
import { z } from '@hono/zod-openapi';

const VotingRulesSchema = z
  .object({
    durationHours: z.number().int().min(1).max(2160),
    quorumPercent: z.number().min(0).max(100),
    thresholdPercent: z.number().min(1).max(100),
    thresholdKind: z.enum(['PERCENT', 'SIMPLE_MAJORITY', 'ABSOLUTE_MAJORITY', 'UNANIMOUS']),
    allowAbstain: z.boolean(),
    closeWhenDecided: z.boolean().optional(),
  })
  .openapi('GovernanceVotingRules');
export { VotingRulesSchema };
