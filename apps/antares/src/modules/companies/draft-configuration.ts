import { monetaryHash } from '../monetary/domain';
import type { CompanyDraft } from './registration-contracts';
import type { DraftRecord } from './drafts';
import { emptyConfiguration } from '../states/domain';
import type { CompanyConfiguration } from './contracts';

function emptyCompanyConfiguration(ownerId: string): CompanyConfiguration {
  return {
    registrationStateId: null,
    name: {},
    description: {},
    categories: [],
    totalShares: '1',
    allocations: [{ owner: { type: 'PLAYER', id: ownerId }, shares: '1' }],
    charter: {
      offices: [],
      policies: [],
      votingDefaults: emptyConfiguration().governance.votingDefaults,
      shareTransfers: 'OWNER_CONSENT',
    },
    document: {},
  };
}
function formationHash(companyId: string, configuration: CompanyConfiguration): string {
  return monetaryHash({ companyId, configuration });
}
function draftDto(record: DraftRecord): CompanyDraft {
  return {
    ...record,
    formationHash: formationHash(record.companyId, record.configuration),
    updatedAt: record.updatedAt.toISOString(),
    deletedAt: record.deletedAt?.toISOString() ?? null,
  };
}
export { emptyCompanyConfiguration, formationHash, draftDto };
