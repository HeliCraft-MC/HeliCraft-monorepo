// oxlint-disable import/max-dependencies -- State/wallet read composition combines authority, localization, immutable history and the ledger service.
// oxlint-disable no-await-in-loop -- Read models hydrate bounded immutable records on one transaction connection.
import { and, eq, inArray } from 'drizzle-orm';
import type { z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { currencies, financialAccounts } from '../../db/schema';
import { assignmentState } from '../states/office-assignment-context';
import { DomainError, HTTP } from '../errors';
import { monetaryActor, bankRecord } from './store';
import type {
  MonetaryActor,
  WalletTransfer,
  StateMonetarySchema,
  WalletSchema,
  PublicCurrencySchema,
} from './contracts';
import { WalletTransferSchema } from './contracts';
import { directiveContext } from './directive-context';
import {
  bankDto,
  currencyDto,
  heldCurrencyDtos,
  accountDto,
  accountHistory,
  stateAccounts,
  stateDirectiveIds,
  HISTORY_LIMIT,
} from './read-models';
import { publicCurrencyDto, publicCurrencyRecords } from './public';
import { policyHistory } from './statistics';
import { transferWallet } from '../taxation/settlement';
import { createQuote } from '../taxation/quotes';
import type { TaxCalculation } from '../taxation/contracts';

class MonetaryService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async state(
    stateId: string,
    actor: MonetaryActor,
    page = 1,
  ): Promise<z.infer<typeof StateMonetarySchema>> {
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, actor);
      await assignmentState(transaction, stateId, actor);
      const bank = await bankRecord(transaction, stateId);
      const [currency] = await transaction
        .select()
        .from(currencies)
        .where(eq(currencies.stateId, stateId));
      const accounts = await stateAccounts(transaction, stateId, bank?.id ?? null);
      const currencyViews = await heldCurrencyDtos(transaction, [
        ...accounts.map((account) => account.currencyId),
        ...(currency === undefined ? [] : [currency.id]),
      ]);
      const directives: z.infer<typeof StateMonetarySchema>['directives'] = [];
      const ids = await stateDirectiveIds(transaction, stateId, page);
      const history = await accountHistory(transaction, accounts, page);
      for (const id of ids.slice(0, HISTORY_LIMIT)) {
        const context = await directiveContext(transaction, id, actor);
        directives.push(context.detail);
      }
      const policies = currency ? await policyHistory(transaction, currency.id, page) : [];
      return {
        bank: bank === null ? null : await bankDto(transaction, bank),
        currency: currency ? await currencyDto(transaction, currency) : null,
        currencies: currencyViews,
        accounts,
        directives,
        policyHistory: policies.slice(0, HISTORY_LIMIT),
        transactions: history.slice(0, HISTORY_LIMIT),
        page,
        hasMore:
          ids.length > HISTORY_LIMIT ||
          history.length > HISTORY_LIMIT ||
          policies.length > HISTORY_LIMIT,
      };
    });
  }
  public async wallet(actorId: string, page = 1): Promise<z.infer<typeof WalletSchema>> {
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, { id: actorId, admin: false });
      const records = await transaction
        .select()
        .from(financialAccounts)
        .where(and(eq(financialAccounts.ownerId, actorId), eq(financialAccounts.kind, 'PLAYER')));
      const accounts = records.map((record) => accountDto(record));
      const currencyRecords =
        accounts.length === 0
          ? []
          : await transaction
              .select()
              .from(currencies)
              .where(
                inArray(
                  currencies.id,
                  accounts.map((item) => item.currencyId),
                ),
              );
      const currencyDtos: z.infer<typeof WalletSchema>['currencies'] = [];
      for (const currency of currencyRecords) {
        currencyDtos.push(await currencyDto(transaction, currency));
      }
      const history = await accountHistory(transaction, accounts, page);
      return {
        accounts,
        currencies: currencyDtos,
        transactions: history.slice(0, HISTORY_LIMIT),
        page,
        hasMore: history.length > HISTORY_LIMIT,
      };
    });
  }
  public async quote(
    actorId: string,
    raw: WalletTransfer,
  ): Promise<{ id: string; expiresAt: string; calculation: TaxCalculation }> {
    const input = WalletTransferSchema.parse(raw);
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, { id: actorId, admin: false });
      return await createQuote(transaction, actorId, input);
    });
  }
  public async transfer(actorId: string, raw: WalletTransfer): Promise<string> {
    const input = WalletTransferSchema.parse(raw);
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, { id: actorId, admin: false });
      return await transferWallet(transaction, actorId, input);
    });
  }
  public async publicCurrencies(
    after?: string,
  ): Promise<{ items: z.infer<typeof PublicCurrencySchema>[]; nextCode: string | null }> {
    return await this.db.transaction(
      async (transaction) => {
        const records = await publicCurrencyRecords(transaction, { after });
        const result: z.infer<typeof PublicCurrencySchema>[] = [];
        for (const record of records.slice(0, HISTORY_LIMIT)) {
          result.push(await publicCurrencyDto(transaction, record));
        }
        return {
          items: result,
          nextCode:
            records.length > HISTORY_LIMIT ? (records[HISTORY_LIMIT - 1]?.code ?? null) : null,
        };
      },
      { isolationLevel: 'repeatable read' },
    );
  }
  public async publicCurrency(
    code: string,
    page = 1,
  ): Promise<z.infer<typeof PublicCurrencySchema>> {
    return await this.db.transaction(
      async (transaction) => {
        const [record] = await publicCurrencyRecords(transaction, { code });
        if (!record) {
          throw new DomainError(HTTP.notFound, 'CURRENCY_NOT_FOUND', 'Валюта не найдена');
        }
        return await publicCurrencyDto(transaction, record, page);
      },
      { isolationLevel: 'repeatable read' },
    );
  }
}
export { MonetaryService };
