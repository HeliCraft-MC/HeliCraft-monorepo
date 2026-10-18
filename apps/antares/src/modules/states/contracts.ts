// oxlint-disable max-lines -- Cohesive domain contract or composed editor; validation, persistence and individual controls are separate modules.
// oxlint-disable no-magic-numbers -- Product limits are declared directly in the OpenAPI schemas.
import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';
import { VotingRulesSchema } from '../voting/rules';

const StateStatusSchema = z.enum([
  'CREATED',
  'ACTIVE',
  'SUSPENDED',
  'REJECTED',
  'DORMANT',
  'DISSOLVED',
]);
const ActionSchema = z.enum([
  'ENACT_LAW',
  'REPEAL_LAW',
  'AMEND_GOVERNANCE',
  'ACCEPT_CITIZEN',
  'REMOVE_CITIZEN',
  'APPOINT_OFFICE_HOLDER',
  'REMOVE_OFFICE_HOLDER',
  'CREATE_INSTITUTION',
  'CHANGE_TERRITORY',
  'SIGN_TREATY',
  'ISSUE_CURRENCY',
  'ESTABLISH_CENTRAL_BANK',
  'CHANGE_BANK_CHARTER',
  'CREATE_CURRENCY',
  'CHANGE_MONETARY_POLICY',
  'BURN_CURRENCY',
  'TRANSFER_CENTRAL_BANK',
  'SPEND_TREASURY',
  'ESTABLISH_TAX_OFFICE',
  'CHANGE_TAX_OFFICE_CHARTER',
  'AMEND_TAX_LAW',
  'AMEND_TREATY',
  'DENOUNCE_TREATY',
  'DECLARE_WAR',
]);
const DyeSchema = z.enum([
  'white',
  'orange',
  'magenta',
  'light_blue',
  'yellow',
  'lime',
  'pink',
  'gray',
  'light_gray',
  'cyan',
  'purple',
  'blue',
  'brown',
  'green',
  'red',
  'black',
]);
const PatternSchema = z.enum([
  'stripe_bottom',
  'stripe_top',
  'stripe_left',
  'stripe_right',
  'stripe_center',
  'stripe_middle',
  'stripe_downright',
  'stripe_downleft',
  'small_stripes',
  'cross',
  'straight_cross',
  'triangle_bottom',
  'triangle_top',
  'triangles_bottom',
  'triangles_top',
  'diagonal_left',
  'diagonal_up_right',
  'diagonal_up_left',
  'diagonal_right',
  'circle',
  'rhombus',
  'half_vertical',
  'half_horizontal',
  'half_vertical_right',
  'half_horizontal_bottom',
  'border',
  'curly_border',
  'gradient',
  'gradient_up',
  'bricks',
  'square_bottom_left',
  'square_bottom_right',
  'square_top_left',
  'square_top_right',
  'creeper',
  'skull',
  'flower',
  'mojang',
  'globe',
  'piglin',
  'flow',
  'guster',
]);
const BannerSchema = z
  .object({
    baseColor: DyeSchema,
    layers: z.array(z.object({ pattern: PatternSchema, color: DyeSchema })).max(6),
  })
  .openapi('MinecraftBanner');
const HorizontalFlagSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('BANNER'), design: BannerSchema }),
  z.object({ mode: z.literal('PNG'), mediaId: z.uuid().nullable() }),
]);
const OfficeSchema = z
  .object({
    id: z.uuid(),
    name: LocalizedInputSchema,
    description: LocalizedInputSchema,
    isHeadOfState: z.boolean(),
    maxHolders: z.number().int().min(1).max(100),
    required: z.boolean(),
    initialHolderIds: z.array(z.uuid()).max(100),
    appointment: z.enum([
      'APPOINTED_BY_OFFICE',
      'CITIZEN_VOTE',
      'COUNCIL_VOTE',
      'MANUAL_PROCEDURE',
    ]),
    appointingOfficeId: z.uuid().nullable(),
    term: z.enum(['INDEFINITE', 'FIXED_TERM']),
    termDays: z.number().int().min(1).max(36_500).nullable(),
    vacancy: z.enum(['APPOINTMENT', 'ELECTION', 'COUNCIL', 'MANUAL']),
    inactivityDays: z.number().int().min(1).max(36_500).nullable(),
  })
  .openapi('StateOffice');
const PolicySchema = z
  .object({
    action: ActionSchema,
    mechanism: z.enum([
      'SINGLE_OFFICE',
      'ANY_OF_OFFICES',
      'MULTIPLE_OFFICES',
      'CITIZEN_VOTE',
      'COUNCIL_VOTE',
      'COMBINED',
      'MANUAL',
    ]),
    officeIds: z.array(z.uuid()).max(100),
    vote: VotingRulesSchema.nullable().openapi('OptionalVotingRules'),
    manualProcedure: LocalizedInputSchema,
  })
  .openapi('GovernancePolicy');
const GeneratedKindSchema = z.enum([
  'STATE_IDENTITY',
  'FOUNDERS',
  'CITIZENSHIP_RULES',
  'OFFICES_OVERVIEW',
  'SINGLE_OFFICE',
  'OFFICE_APPOINTMENT_RULE',
  'STATE_DECISION_RULE',
  'VOTING_RULES',
  'GOVERNANCE_SUMMARY',
]);
const ConstitutionBlockSchema = z
  .discriminatedUnion('type', [
    z.object({ id: z.uuid(), type: z.literal('MARKDOWN'), content: LocalizedInputSchema }),
    z.object({
      id: z.uuid(),
      type: z.literal('GENERATED'),
      kind: GeneratedKindSchema,
      officeId: z.uuid().nullable(),
      action: ActionSchema.nullable(),
    }),
  ])
  .openapi('ConstitutionBlock');
const ConstitutionSchema = z
  .object({ title: LocalizedInputSchema, blocks: z.array(ConstitutionBlockSchema).max(200) })
  .nullable();
const GovernanceSchema = z
  .object({
    offices: z.array(OfficeSchema).max(100),
    policies: z.array(PolicySchema).max(100),
    votingDefaults: VotingRulesSchema,
    createdFromPreset: z.string().max(80).nullable(),
  })
  .openapi('StateGovernance');
const StateConfigurationSchema = z
  .object({
    name: LocalizedInputSchema,
    description: LocalizedInputSchema,
    slug: z.string().max(100),
    color: z.string().max(20),
    verticalBanner: BannerSchema,
    horizontalFlag: HorizontalFlagSchema,
    cofounderIds: z.array(z.uuid()).max(100),
    citizenship: z.object({
      entryMode: z.enum(['BY_APPLICATION', 'BY_INVITATION', 'OPEN']),
      allowMultipleCitizenships: z.boolean(),
    }),
    governance: GovernanceSchema,
    constitution: ConstitutionSchema,
  })
  .openapi('StateConfiguration');
const DraftVotingRulesSchema = z
  .object({
    ...VotingRulesSchema.shape,
    durationHours: z.number(),
    quorumPercent: z.number(),
    thresholdPercent: z.number(),
  })
  .openapi('DraftVotingRules');
const DraftOfficeSchema = z
  .object({
    ...OfficeSchema.shape,
    maxHolders: z.number(),
    termDays: z.number().nullable(),
    inactivityDays: z.number().nullable(),
  })
  .openapi('DraftOffice');
const DraftPolicySchema = z
  .object({
    ...PolicySchema.shape,
    vote: DraftVotingRulesSchema.nullable().openapi('OptionalDraftVotingRules'),
  })
  .openapi('DraftPolicy');
const DraftGovernanceSchema = z
  .object({
    ...GovernanceSchema.shape,
    offices: z.array(DraftOfficeSchema).max(100),
    policies: z.array(DraftPolicySchema).max(100),
    votingDefaults: DraftVotingRulesSchema,
  })
  .openapi('DraftGovernance');
const DraftConfigurationSchema = z
  .object({ ...StateConfigurationSchema.shape, governance: DraftGovernanceSchema })
  .openapi('DraftStateConfiguration');
const IssueSchema = z.object({
  severity: z.enum(['ERROR', 'WARNING']),
  path: z.string(),
  message: z.string(),
});
const DraftSchema = z
  .object({
    id: z.uuid(),
    ownerId: z.uuid(),
    stateId: z.uuid().nullable(),
    baseRevisionId: z.uuid().nullable(),
    title: z.string(),
    version: z.number().int(),
    step: z.number().int(),
    progress: z.number(),
    configuration: DraftConfigurationSchema,
    updatedAt: z.iso.datetime(),
    submittedStateId: z.uuid().nullable(),
    deletedAt: z.iso.datetime().nullable(),
  })
  .openapi('StateDraft');
const SaveDraftSchema = z.object({
  version: z.number().int().min(1),
  title: z.string().max(160),
  step: z.number().int().min(0).max(12),
  configuration: DraftConfigurationSchema,
});
const StateDetailSchema = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    status: StateStatusSchema,
    statusReason: z.string().nullable(),
    configuration: StateConfigurationSchema,
    founders: z.array(
      z.object({ id: z.uuid(), name: z.string(), type: z.enum(['PRIMARY', 'COFOUNDER']) }),
    ),
    citizens: z.array(z.object({ id: z.uuid(), name: z.string() })),
    holders: z.array(
      z.object({ officeId: z.uuid(), userId: z.uuid(), name: z.string(), since: z.iso.datetime() }),
    ),
    governanceRevisionId: z.uuid(),
    governanceRevision: z.number().int(),
    constitutionRevisionId: z.uuid().nullable(),
    createdAt: z.iso.datetime(),
    constitutionHtml: z.array(z.object({ id: z.uuid(), html: z.string() })),
  })
  .openapi('StateDetail');
const ReformProposalSchema = z
  .object({
    id: z.uuid(),
    draftId: z.uuid(),
    ownerId: z.uuid(),
    status: z.enum(['PENDING', 'PUBLISHED', 'SUPERSEDED', 'DELETED']),
    stateId: z.uuid(),
    version: z.number().int(),
    configuration: StateConfigurationSchema,
    founders: StateDetailSchema.shape.founders,
    html: StateDetailSchema.shape.constitutionHtml,
  })
  .openapi('ReformProposal');
const StateListSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      slug: z.string(),
      status: StateStatusSchema,
      color: z.string(),
      horizontalFlag: HorizontalFlagSchema.optional(),
      name: LocalizedInputSchema,
    }),
  ),
});
const RevisionSchema = z.object({
  id: z.uuid(),
  number: z.number().int(),
  previousRevisionId: z.uuid().nullable(),
  actorId: z.uuid(),
  adminOverride: z.boolean(),
  reason: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
type StateConfiguration = z.infer<typeof StateConfigurationSchema>;
type Governance = z.infer<typeof GovernanceSchema>;
type Office = z.infer<typeof OfficeSchema>;
type Policy = z.infer<typeof PolicySchema>;
type StateDraft = z.infer<typeof DraftSchema>;
type StateDetail = z.infer<typeof StateDetailSchema>;
type Issue = z.infer<typeof IssueSchema>;
type StateStatus = z.infer<typeof StateStatusSchema>;
export { VotingRulesSchema } from '../voting/rules';
export {
  StateStatusSchema,
  ActionSchema,
  DyeSchema,
  PatternSchema,
  BannerSchema,
  HorizontalFlagSchema,
  OfficeSchema,
  PolicySchema,
  GeneratedKindSchema,
  ConstitutionBlockSchema,
  ConstitutionSchema,
  GovernanceSchema,
  StateConfigurationSchema,
  IssueSchema,
  DraftSchema,
  SaveDraftSchema,
  StateDetailSchema,
  RevisionSchema,
  StateListSchema,
  ReformProposalSchema,
  type StateConfiguration,
  type Governance,
  type Office,
  type Policy,
  type StateDraft,
  type StateDetail,
  type Issue,
  type StateStatus,
};
