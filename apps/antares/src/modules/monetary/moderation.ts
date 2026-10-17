import { desc, eq } from 'drizzle-orm';
import type { Database } from '../../db';
import { centralBanks, bankReviews, monetaryDirectives } from '../../db/schema';
import { authorizeMutation } from '../permissions/transaction';
import { stateRecord } from '../states/persistence';
import type { Bank } from './contracts';
import { bankDto } from './read-models';
import { directiveRecord, bankRecord, monetaryAudit } from './store';
import { monetaryError } from './domain';

class BankModerationService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async list(actorId: string, status?: Bank['status']): Promise<Bank[]> {
    return await this.db.transaction(async (transaction) => {
      await authorizeMutation(transaction, actorId, 'states.manage');
      const query = transaction.select().from(centralBanks);
      const rows = await (
        status === undefined ? query : query.where(eq(centralBanks.status, status))
      ).orderBy(desc(centralBanks.createdAt));
      const result: Bank[] = [];
      for (const row of rows) {
        // oxlint-disable-next-line no-await-in-loop -- One transaction connection hydrates institution history in order.
        result.push(await bankDto(transaction, row));
      }
      return result;
    });
  }
  // oxlint-disable-next-line max-lines-per-function -- Ratification checks the exact approved application and appends its administrative decision atomically.
  public async review(
    id: string,
    actorId: string,
    input: Readonly<{ directiveId: string; status: Bank['status']; reason: string }>,
  ): Promise<void> {
    // oxlint-disable-next-line max-lines-per-function -- Status, immutable review and audit must commit together.
    await this.db.transaction(async (transaction) => {
      await authorizeMutation(transaction, actorId, 'states.manage');
      const [initial] = await transaction
        .select()
        .from(centralBanks)
        .where(eq(centralBanks.id, id));
      if (!initial) {
        monetaryError('BANK_NOT_FOUND', 'Банк не найден');
      }
      const state = await stateRecord(transaction, initial.stateId);
      const bank = await bankRecord(transaction, state.id);
      const application = await directiveRecord(transaction, input.directiveId);
      if (
        !bank ||
        application.id !== bank.establishmentDirectiveId ||
        application.status !== 'APPLIED' ||
        application.payload.kind !== 'ESTABLISH_BANK' ||
        application.stateId !== state.id
      ) {
        monetaryError(
          'BANK_APPLICATION_MISMATCH',
          'Требуется действующее утверждённое государственное решение об учреждении',
        );
      }
      const transition = `${bank.status}:${input.status}`;
      if (
        !['PENDING:ACTIVE', 'PENDING:REJECTED', 'ACTIVE:SUSPENDED', 'SUSPENDED:ACTIVE'].includes(
          transition,
        ) ||
        input.reason.trim() === '' ||
        (input.status === 'ACTIVE' && state.status !== 'ACTIVE')
      ) {
        monetaryError(
          'BANK_REVIEW_INVALID',
          'Недопустимое изменение статуса, неактивное государство или отсутствует обоснование',
        );
      }
      // State approval was completed before the immutable application entered moderation; ratification grants no monetary authority.
      const [approved] = await transaction
        .select()
        .from(monetaryDirectives)
        .where(eq(monetaryDirectives.id, bank.establishmentDirectiveId));
      if (approved?.appliedAt === null) {
        monetaryError('BANK_NOT_APPROVED', 'Государственное решение не исполнено');
      }
      await transaction.insert(bankReviews).values({
        bankId: id,
        directiveId: input.directiveId,
        actorId,
        status: input.status,
        reason: input.reason.trim(),
      });
      await transaction
        .update(centralBanks)
        .set({ status: input.status })
        .where(eq(centralBanks.id, id));
      await monetaryAudit(transaction, {
        actorId,
        id,
        action: 'monetary.bank.reviewed',
        reason: input.reason.trim(),
      });
    });
  }
}
export { BankModerationService };
