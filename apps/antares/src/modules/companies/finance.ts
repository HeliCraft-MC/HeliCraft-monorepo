import { and, eq, inArray } from 'drizzle-orm';
import { z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { financialAccounts, currencies } from '../../db/schema';
import { WalletSchema } from '../monetary/contracts';
import { accountDto, accountHistory, currencyDto, HISTORY_LIMIT } from '../monetary/read-models';
import type { CompanyActor } from './decision-contracts';
import { corporateActor } from './decision-commands';
import { assertCompanyFinanceReader } from './finance-access';

const CompanyWalletSchema = WalletSchema.extend({ companyId: z.uuid() }).openapi('CompanyWallet');
type CompanyWallet = z.infer<typeof CompanyWalletSchema>;
class CompanyFinanceService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async wallet(companyId: string, actor: CompanyActor, page = 1): Promise<CompanyWallet> {
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      await assertCompanyFinanceReader(transaction, companyId, actor);
      const records = await transaction
        .select()
        .from(financialAccounts)
        .where(
          and(eq(financialAccounts.kind, 'COMPANY'), eq(financialAccounts.ownerId, companyId)),
        );
      const accounts = records.map((record) => accountDto(record));
      const currencyRecords =
        records.length === 0
          ? []
          : await transaction
              .select()
              .from(currencies)
              .where(
                inArray(
                  currencies.id,
                  records.map((record) => record.currencyId),
                ),
              );
      const views: CompanyWallet['currencies'] = [];
      for (const currency of currencyRecords) {
        // oxlint-disable-next-line no-await-in-loop -- Currency names and exact current metadata are read sequentially on the protected financial transaction.
        views.push(await currencyDto(transaction, currency));
      }
      const history = await accountHistory(transaction, accounts, page);
      return {
        companyId,
        accounts,
        currencies: views,
        transactions: history.slice(0, HISTORY_LIMIT),
        page,
        hasMore: history.length > HISTORY_LIMIT,
      };
    });
  }
}
export { CompanyWalletSchema, CompanyFinanceService, type CompanyWallet };
