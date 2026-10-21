import { z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { CorporatePaymentSchema } from './decision-contracts';
import type { CompanyActor } from './decision-contracts';
import { corporateActor } from './decision-commands';
import { createCorporateQuote } from './payment-quote';

const CompanyFinancialQuoteInputSchema = z
  .object({
    revisionId: z.uuid(),
    payment: CorporatePaymentSchema.omit({ quoteId: true, approvedDebitMinor: true }),
  })
  .strict()
  .openapi('CompanyFinancialQuoteInput');
type CompanyFinancialQuoteInput = z.infer<typeof CompanyFinancialQuoteInputSchema>;
class CompanyPaymentQuoteService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async create(
    companyId: string,
    actor: CompanyActor,
    raw: CompanyFinancialQuoteInput,
  ): Promise<Awaited<ReturnType<typeof createCorporateQuote>>> {
    const input = CompanyFinancialQuoteInputSchema.parse(raw);
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      return await createCorporateQuote(transaction, {
        companyId,
        revisionId: input.revisionId,
        actorId: actor.id,
        payload: input.payment,
      });
    });
  }
}
export { CompanyPaymentQuoteService, CompanyFinancialQuoteInputSchema };
