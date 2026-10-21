import { eq } from 'drizzle-orm';
import { companies, users } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { monetaryError } from '../monetary/domain';
import { account } from '../monetary/ledger';
import { ensureSubject } from '../companies/store';
import type { FinancialParty } from './participants';

async function assertFinancialParty(
  transaction: Transaction,
  party: FinancialParty,
): Promise<void> {
  if (party.kind === 'PLAYER') {
    const [player] = await transaction
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, party.id));
    if (player?.status !== 'ACTIVE') {
      monetaryError('RECIPIENT_UNAVAILABLE', 'Аккаунт участника финансовой операции недоступен');
    }
  } else {
    const [company] = await transaction
      .select()
      .from(companies)
      .where(eq(companies.id, party.id))
      .for('update');
    if (
      company?.status !== 'ACTIVE' ||
      company.foundedAt === null ||
      company.currentRevisionId === null
    ) {
      monetaryError(
        'RECIPIENT_UNAVAILABLE',
        'Компания не учреждена или её деятельность приостановлена',
      );
    }
  }
  await ensureSubject(transaction, { type: party.kind, id: party.id });
}
async function financialPartyAccount(
  transaction: Transaction,
  currencyId: string,
  party: FinancialParty,
): Promise<Awaited<ReturnType<typeof account>>> {
  await assertFinancialParty(transaction, party);
  return await account(transaction, { currencyId, kind: party.kind, ownerId: party.id });
}
export { assertFinancialParty, financialPartyAccount };
