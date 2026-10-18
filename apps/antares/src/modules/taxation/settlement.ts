import {
  economicOperations,
  taxAssessments,
  taxAssessmentClaims,
  economicJournals,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { WalletTransfer } from '../monetary/contracts';
import { account, playerAccount, post, previousTransaction } from '../monetary/ledger';
import { currencyRecord } from '../monetary/store';
import { monetaryError } from '../monetary/domain';
import { confirmQuote, transferCommandHash } from './quotes';
import type { TaxCalculation } from './contracts';

// oxlint-disable-next-line max-lines-per-function -- All tax journals and their immutable evidence must commit in the same database transaction.
async function settleTaxes(
  transaction: Transaction,
  input: Readonly<{ actorId: string; operationId: string; calculation: TaxCalculation }>,
): Promise<void> {
  const { actorId, operationId, calculation } = input;
  const currency = await currencyRecord(transaction, calculation.currencyId);
  for (const charge of calculation.charges) {
    const assessmentId = crypto.randomUUID();
    // oxlint-disable-next-line no-await-in-loop -- Evidence and journals are ordered on one atomic PostgreSQL transaction.
    await transaction.insert(taxAssessments).values({
      id: assessmentId,
      operationId,
      assessmentKey: charge.key,
      taxpayerId: charge.taxpayer === 'RECIPIENT' ? calculation.recipientId : actorId,
      currencyId: currency.id,
      baseMinor: calculation.principalMinor,
      charge,
    });
    // oxlint-disable-next-line no-await-in-loop -- Each national law has one relational, revision-pinned claim per economic event.
    await transaction.insert(taxAssessmentClaims).values(
      charge.claims.map((claim) => ({
        assessmentId,
        operationId,
        lawId: claim.lawId,
        revisionId: claim.revisionId,
      })),
    );
    for (const allocation of charge.allocations.filter((item) => item.amountMinor !== '0')) {
      // oxlint-disable-next-line no-await-in-loop -- Each source is reloaded after the preceding posting trigger updates its balance.
      const source = await account(transaction, {
        currencyId: currency.id,
        kind: 'PLAYER',
        ownerId: charge.taxpayer === 'RECIPIENT' ? calculation.recipientId : actorId,
      });
      // oxlint-disable-next-line no-await-in-loop -- Treasury accounts support the event currency without creating or exchanging currency.
      const target = await account(transaction, {
        currencyId: currency.id,
        kind: allocation.beneficiary?.kind ?? 'TREASURY',
        ownerId: allocation.beneficiary?.ownerId ?? allocation.stateId,
      });
      // oxlint-disable-next-line no-await-in-loop -- Internal journals deliberately bypass taxable event dispatch to prevent recursion.
      const journalId = await post(transaction, {
        actorId,
        key: crypto.randomUUID(),
        hash: transferCommandHash({
          idempotencyKey: operationId,
          currencyId: currency.id,
          recipientId: allocation.stateId,
          amountMinor: allocation.amountMinor,
          purpose: charge.key,
        }),
        currency,
        kind: 'TRANSFER',
        amountMinor: allocation.amountMinor,
        purpose: `Tax ${assessmentId}`,
        source,
        target,
        directiveId: null,
        policyRevisionId: null,
      });
      // oxlint-disable-next-line no-await-in-loop -- The journal's link belongs to this event and assessment only.
      await transaction
        .insert(economicJournals)
        .values({ journalId, operationId, assessmentId, creditorStateId: allocation.stateId });
    }
  }
}
// oxlint-disable-next-line max-lines-per-function -- Principal, tax evidence and all tax journals share one atomic financial command.
async function transferWallet(
  transaction: Transaction,
  actorId: string,
  input: WalletTransfer,
): Promise<string> {
  const hash = transferCommandHash(input);
  const previous = await previousTransaction(transaction, {
    actorId,
    key: input.idempotencyKey,
    hash,
  });
  if (previous !== null) {
    return previous;
  }
  const currency = await currencyRecord(transaction, input.currencyId);
  if (currency.status !== 'ACTIVE') {
    monetaryError('CURRENCY_BLOCKED', 'Переводы этой валюты приостановлены');
  }
  const calculation = await confirmQuote(transaction, actorId, input);
  const source = await account(transaction, {
    currencyId: currency.id,
    kind: 'PLAYER',
    ownerId: actorId,
  });
  if (BigInt(source.balanceMinor) < BigInt(calculation.totalDebitMinor)) {
    monetaryError('INSUFFICIENT_FUNDS', 'Недостаточно средств на перевод и все налоги');
  }
  const id = await post(transaction, {
    actorId,
    key: input.idempotencyKey,
    hash,
    currency,
    kind: 'TRANSFER',
    amountMinor: input.amountMinor,
    purpose: input.purpose,
    source,
    target: await playerAccount(transaction, currency.id, input.recipientId),
    directiveId: null,
    policyRevisionId: null,
  });
  await transaction.insert(economicOperations).values({
    id,
    actorId,
    recipientId: input.recipientId,
    currencyId: currency.id,
    idempotencyKey: input.idempotencyKey,
    commandHash: hash,
    quoteId: input.quoteId ?? null,
    event: 'PLAYER_TRANSFER',
    calculation,
  });
  await transaction.insert(economicJournals).values({ journalId: id, operationId: id });
  await settleTaxes(transaction, { actorId, operationId: id, calculation });
  return id;
}
export { transferWallet };
