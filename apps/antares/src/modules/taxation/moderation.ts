import { desc, eq } from 'drizzle-orm';
import type { z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { taxOffices, taxOfficeReviews } from '../../db/schema';
import { authorizeMutation } from '../permissions/transaction';
import { stateRecord } from '../states/persistence';
import { directiveRecord, monetaryAudit } from '../monetary/store';
import { monetaryError } from '../monetary/domain';
import { taxOfficeDto } from './read-models';
import type { TaxOfficeSchema } from './read-contracts';

const REVIEW_LIMIT = 100;
class TaxOfficeModerationService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async list(actorId: string): Promise<z.infer<typeof TaxOfficeSchema>[]> {
    return await this.db.transaction(async (transaction) => {
      await authorizeMutation(transaction, actorId, 'states.manage');
      const records = await transaction
        .select()
        .from(taxOffices)
        .orderBy(desc(taxOffices.createdAt))
        .limit(REVIEW_LIMIT);
      const result: z.infer<typeof TaxOfficeSchema>[] = [];
      for (const record of records) {
        // oxlint-disable-next-line no-await-in-loop -- Bounded review queue hydrates immutable text and history in order.
        result.push(await taxOfficeDto(transaction, record));
      }
      return result;
    });
  }
  // oxlint-disable-next-line max-lines-per-function -- Exact application, institution transition and immutable administrative history are one review boundary.
  public async review(
    id: string,
    actorId: string,
    input: Readonly<{
      directiveId: string;
      status: z.infer<typeof TaxOfficeSchema>['status'];
      reason: string;
    }>,
  ): Promise<void> {
    // oxlint-disable-next-line max-lines-per-function -- Review status, history and audit must commit together.
    await this.db.transaction(async (transaction) => {
      await authorizeMutation(transaction, actorId, 'states.manage');
      const [office] = await transaction
        .select()
        .from(taxOffices)
        .where(eq(taxOffices.id, id))
        .for('update');
      if (!office) {
        monetaryError('TAX_OFFICE_NOT_FOUND', 'Налоговая служба не найдена');
      }
      const state = await stateRecord(transaction, office.stateId);
      const application = await directiveRecord(transaction, input.directiveId);
      if (
        application.id !== office.establishmentDirectiveId ||
        application.status !== 'APPLIED' ||
        application.payload.kind !== 'ESTABLISH_TAX_OFFICE' ||
        application.stateId !== state.id ||
        application.appliedAt === null
      ) {
        monetaryError(
          'TAX_APPLICATION_MISMATCH',
          'Требуется точное исполненное решение государства об учреждении',
        );
      }
      if (
        !['PENDING:ACTIVE', 'PENDING:REJECTED', 'ACTIVE:SUSPENDED', 'SUSPENDED:ACTIVE'].includes(
          `${office.status}:${input.status}`,
        ) ||
        input.reason.trim() === '' ||
        (input.status === 'ACTIVE' && state.status !== 'ACTIVE')
      ) {
        monetaryError(
          'TAX_REVIEW_INVALID',
          'Недопустимый статус, неактивное государство или отсутствует обоснование',
        );
      }
      await transaction.insert(taxOfficeReviews).values({
        officeId: id,
        directiveId: input.directiveId,
        actorId,
        status: input.status,
        reason: input.reason.trim(),
      });
      await transaction
        .update(taxOffices)
        .set({ status: input.status })
        .where(eq(taxOffices.id, id));
      await monetaryAudit(transaction, {
        actorId,
        id,
        action: 'taxation.office.reviewed',
        reason: input.reason.trim(),
      });
    });
  }
}
export { TaxOfficeModerationService };
