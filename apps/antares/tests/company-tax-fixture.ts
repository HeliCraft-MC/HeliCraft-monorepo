import { eq } from 'drizzle-orm';
import type { Database } from '../src/db';
import { companies } from '../src/db/schema';
import type { monetaryFixture } from './monetary-fixture';
import {
  officeCompanyConfiguration,
  prepareCompany,
  submitPreparedCompany,
} from './companies-fixture';

type TaxStateFixture = Awaited<ReturnType<typeof monetaryFixture>>;
async function registeredTaxCompany(
  db: Database['db'],
  state: TaxStateFixture,
  multiple = false,
): Promise<{ id: string; revisionId: string; secondOfficeId: string | null }> {
  const configuration = officeCompanyConfiguration(state.founderId, state.stateId);
  const [office] = configuration.charter.offices;
  if (office === undefined) {
    throw new Error('Financial fixture office missing');
  }
  office.initialHolderIds = [state.citizenId];
  let secondOfficeId: string | null = null;
  if (multiple) {
    secondOfficeId = crypto.randomUUID();
    configuration.charter.offices.push({
      ...office,
      id: secondOfficeId,
      name: { en: 'Independent approval' },
      initialHolderIds: [state.founderId],
    });
    const offices = [office.id, secondOfficeId];
    configuration.charter.policies = configuration.charter.policies.map((policy) =>
      policy.action === 'TRANSFER_FUNDS'
        ? {
            action: policy.action,
            financialBands: policy.financialBands,
            procedure: {
              mechanism: 'MULTIPLE_OFFICES',
              officeIds: offices,
              vote: null,
              manualProcedure: {},
            },
          }
        : policy,
    );
  }
  const draft = await prepareCompany(db, { applicantId: state.founderId, configuration });
  await submitPreparedCompany(db, draft);
  const [company] = await db.select().from(companies).where(eq(companies.id, draft.companyId));
  if (company?.currentRevisionId === null || company?.currentRevisionId === undefined) {
    throw new Error('Registered charter missing');
  }
  return { id: company.id, revisionId: company.currentRevisionId, secondOfficeId };
}
export { registeredTaxCompany, type TaxStateFixture };
