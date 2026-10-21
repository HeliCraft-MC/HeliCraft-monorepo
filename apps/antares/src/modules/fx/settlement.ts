import { fxExchanges, fxExchangeJournals } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { account, post } from '../monetary/ledger';
import { monetaryError } from '../monetary/domain';
import { activeFxCurrency } from './store';

interface FxParty {
  readonly kind: 'PLAYER' | 'CENTRAL_BANK';
  readonly id: string;
}
interface FxLeg {
  readonly currencyId: string;
  readonly amountMinor: string;
  readonly from: FxParty;
  readonly to: FxParty;
}
type FxSource =
  | Readonly<{
      offerId: string;
      quoteId: string;
      tradeId?: never;
      firstApprovalId?: never;
      secondApprovalId?: never;
    }>
  | Readonly<{
      tradeId: string;
      firstApprovalId: string;
      secondApprovalId: string;
      offerId?: never;
      quoteId?: never;
    }>;
interface FxSettlement {
  readonly id: string;
  readonly actorId: string;
  readonly key: string;
  readonly hash: string;
  readonly source: FxSource;
  readonly receive: FxLeg;
  readonly provide: FxLeg;
}
async function settleLeg(
  transaction: Transaction,
  input: FxSettlement,
  leg: FxLeg,
): Promise<string> {
  const currency = await activeFxCurrency(transaction, leg.currencyId);
  return await post(transaction, {
    actorId: input.actorId,
    key: crypto.randomUUID(),
    hash: input.hash,
    currency,
    kind: 'TRANSFER',
    amountMinor: leg.amountMinor,
    purpose: 'Atomic currency exchange',
    directiveId: null,
    policyRevisionId: null,
    source: await account(transaction, {
      currencyId: currency.id,
      kind: leg.from.kind,
      ownerId: leg.from.id,
    }),
    target: await account(transaction, {
      currencyId: currency.id,
      kind: leg.to.kind,
      ownerId: leg.to.id,
    }),
  });
}
async function settleFx(transaction: Transaction, input: FxSettlement): Promise<void> {
  if (
    input.receive.currencyId === input.provide.currencyId ||
    BigInt(input.receive.amountMinor) <= 0n ||
    BigInt(input.provide.amountMinor) <= 0n
  ) {
    monetaryError(
      'FX_EXCHANGE_INVALID',
      'Обмен должен передавать положительные суммы двух разных валют',
    );
  }
  await transaction.insert(fxExchanges).values({
    id: input.id,
    actorId: input.actorId,
    idempotencyKey: input.key,
    commandHash: input.hash,
    offerId: input.source.offerId ?? null,
    tradeId: input.source.tradeId ?? null,
    quoteId: input.source.quoteId ?? null,
    firstApprovalId: input.source.firstApprovalId ?? null,
    secondApprovalId: input.source.secondApprovalId ?? null,
    receiveCurrencyId: input.receive.currencyId,
    provideCurrencyId: input.provide.currencyId,
    receiveMinor: input.receive.amountMinor,
    provideMinor: input.provide.amountMinor,
  });
  const receive = await settleLeg(transaction, input, input.receive);
  const provide = await settleLeg(transaction, input, input.provide);
  await transaction.insert(fxExchangeJournals).values([
    { exchangeId: input.id, leg: 'RECEIVE', journalId: receive },
    { exchangeId: input.id, leg: 'PROVIDE', journalId: provide },
  ]);
}
export { settleFx, type FxSettlement };
