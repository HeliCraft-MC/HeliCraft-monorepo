import type {
  CompanyConfiguration,
  CompanyRegistrationPolicy,
} from '../src/modules/companies/contracts';
import { CompanyActionSchema } from '../src/modules/companies/contracts';
import { emptyConfiguration } from '../src/modules/states/domain';
import type { Database } from '../src/db';
import { CompanyDraftService } from '../src/modules/companies/drafts';
import { CompanyConsentService } from '../src/modules/companies/consents';
import { CompanyRegistrationService } from '../src/modules/companies/registration';
import type { CompanyDraft } from '../src/modules/companies/registration-contracts';

const freeCompanyPolicy: CompanyRegistrationPolicy = {
  companyMode: 'FREE',
  foreignPlayerFounders: 'ALLOW',
  corporateFounders: 'ALLOW',
  stateFounders: 'ALLOW',
  branchMode: 'APPROVAL',
  foreignBranches: 'ALLOW',
  registrationFee: null,
};
function officeCompanyConfiguration(actorId: string, stateId: string): CompanyConfiguration {
  const officeId = crypto.randomUUID();
  const procedure = {
    mechanism: 'SINGLE_OFFICE' as const,
    officeIds: [officeId],
    vote: null,
    manualProcedure: {},
  };
  return {
    registrationStateId: stateId,
    name: { en: 'Universal legal company', ru: 'Универсальная компания' },
    description: { en: 'Activities chosen by its owners' },
    categories: [],
    totalShares: '37',
    allocations: [{ owner: { type: 'PLAYER', id: actorId }, shares: '37' }],
    charter: {
      offices: [
        {
          id: officeId,
          name: { en: 'Authorized representative', ru: 'Уполномоченный представитель' },
          description: {},
          maxHolders: 1,
          required: false,
          termDays: null,
          appointment: procedure,
          removal: procedure,
          initialHolderIds: [actorId],
        },
      ],
      policies: CompanyActionSchema.options.map((action) => ({
        action,
        procedure,
        financialBands: [],
      })),
      votingDefaults: emptyConfiguration().governance.votingDefaults,
      shareTransfers: 'OWNER_CONSENT',
    },
    document: { en: '# Charter\nCorporate powers follow the machine-readable charter.' },
  };
}
async function prepareCompany(
  db: Database['db'],
  input: Readonly<{ applicantId: string; configuration: CompanyConfiguration }>,
): Promise<CompanyDraft> {
  const drafts = new CompanyDraftService(db);
  const consents = new CompanyConsentService(db);
  const initial = await drafts.create(input.applicantId, 'Corporate fixture');
  const draft = await drafts.save(initial.id, input.applicantId, {
    version: initial.version,
    title: initial.title,
    step: 1,
    configuration: input.configuration,
  });
  const participants = input.configuration.allocations
    .filter((allocation) => allocation.owner.type === 'PLAYER')
    .map((allocation) => allocation.owner.id);
  for (const actorId of participants) {
    // oxlint-disable-next-line no-await-in-loop -- Each real initial owner signs the exact draft in its own authorized service transaction.
    await consents.grant(draft.id, actorId, {
      role: 'FOUNDER',
      formationHash: draft.formationHash,
      idempotencyKey: crypto.randomUUID(),
    });
  }
  for (const actorId of new Set(
    input.configuration.charter.offices.flatMap((office) => office.initialHolderIds),
  )) {
    // oxlint-disable-next-line no-await-in-loop -- Appointments are consented independently by each selected player.
    await consents.grant(draft.id, actorId, {
      role: 'OFFICE_HOLDER',
      formationHash: draft.formationHash,
      idempotencyKey: crypto.randomUUID(),
    });
  }
  return draft;
}
async function submitPreparedCompany(db: Database['db'], draft: CompanyDraft): Promise<void> {
  const registrations = new CompanyRegistrationService(db);
  const review = await registrations.review(draft.id, draft.ownerId);
  if (!review.ready) {
    throw new Error(review.problem ?? 'Company fixture not ready');
  }
  await registrations.submit(draft.id, draft.ownerId, {
    version: draft.version,
    formationHash: draft.formationHash,
    policyRevisionId: review.policyRevisionId,
    idempotencyKey: crypto.randomUUID(),
  });
}
export { officeCompanyConfiguration, freeCompanyPolicy, prepareCompany, submitPreparedCompany };
