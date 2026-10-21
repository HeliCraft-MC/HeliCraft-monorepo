// oxlint-disable import/max-dependencies -- Typed legal participants, exact residuals and journal evidence commit through the shared ledger and tax engine.
import {
  economicOperations,
  taxAssessments,
  taxAssessmentClaims,
  economicJournals,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { WalletTransfer } from '../monetary/contracts';
import { account, post, previousTransaction } from '../monetary/ledger';
import { currencyRecord } from '../monetary/store';
import { monetaryError } from '../monetary/domain';
import { confirmQuote, transferCommandHash } from './quotes';
import type { TaxCalculation } from './contracts';
import { recordAccruals } from './accrual-store';
import { calculationParty } from './participants';
import { financialPartyAccount } from './party-store';

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
      taxpayerId: calculationParty(calculation, charge.taxpayer ?? 'SENDER').id,
      currencyId: currency.id,
      baseMinor: charge.baseMinor ?? calculation.principalMinor,
      charge,
    });
    // oxlint-disable-next-line no-await-in-loop -- Exact residuals advance atomically with the assessment, principal and tax journals.
    await recordAccruals(transaction, assessmentId, charge);
    // oxlint-disable-next-line no-await-in-loop -- Each national law has one relational, revision-pinned claim per economic event.
    await transaction.insert(taxAssessmentClaims).values(
      charge.claims.map((claim) => ({
        assessmentId,
        operationId,
        lawId: claim.lawId,
        revisionId: claim.revisionId,
        regimeRevisionId: claim.regime?.revisionId ?? null,
      })),
    );
    for (const allocation of charge.allocations.filter((item) => item.amountMinor !== '0')) {
      // oxlint-disable-next-line no-await-in-loop -- Each source is reloaded after the preceding posting trigger updates its balance.
      const source = await account(transaction, {
        currencyId: currency.id,
        kind: calculationParty(calculation, charge.taxpayer ?? 'SENDER').kind,
        ownerId: calculationParty(calculation, charge.taxpayer ?? 'SENDER').id,
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
interface FinancialSettlement {
  readonly actorId: string;
  readonly initiatorId: string;
  readonly key: string;
  readonly hash: string;
  readonly quoteId: string | null;
  readonly companyDecisionId?: string;
  readonly calculation: TaxCalculation;
  readonly purpose: string;
}
// oxlint-disable-next-line max-lines-per-function -- The principal, typed legal parties, tax assessments and exact residual movements commit as one operation.
async function settleFinancialTransfer(
  transaction: Transaction,
  input: FinancialSettlement,
): Promise<string> {
  const { actorId, calculation } = input;
  const currency = await currencyRecord(transaction, calculation.currencyId);
  if (currency.status !== 'ACTIVE') {
    monetaryError('CURRENCY_BLOCKED', 'Переводы этой валюты приостановлены');
  }
  const source = await financialPartyAccount(
    transaction,
    currency.id,
    calculationParty(calculation, 'SENDER'),
  );
  if (BigInt(source.balanceMinor) < BigInt(calculation.totalDebitMinor)) {
    monetaryError('INSUFFICIENT_FUNDS', 'Недостаточно средств на перевод и все налоги');
  }
  const id = await post(transaction, {
    actorId,
    key: input.key,
    hash: input.hash,
    currency,
    kind: 'TRANSFER',
    amountMinor: calculation.principalMinor,
    purpose: input.purpose,
    source,
    target: await financialPartyAccount(
      transaction,
      currency.id,
      calculationParty(calculation, 'RECIPIENT'),
    ),
    directiveId: null,
    companyDecisionId: input.companyDecisionId,
    policyRevisionId: null,
  });
  await transaction.insert(economicOperations).values({
    id,
    actorId,
    initiatorId: input.initiatorId,
    senderId: calculation.senderId,
    senderKind: calculation.senderKind ?? 'PLAYER',
    recipientId: calculation.recipientId,
    recipientKind: calculation.recipientKind ?? 'PLAYER',
    currencyId: currency.id,
    idempotencyKey: input.key,
    commandHash: input.hash,
    companyDecisionId: input.companyDecisionId ?? null,
    quoteId: input.quoteId,
    event: calculation.event,
    calculation,
  });
  await transaction.insert(economicJournals).values({ journalId: id, operationId: id });
  await settleTaxes(transaction, { actorId, operationId: id, calculation });
  return id;
}
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
  return await settleFinancialTransfer(transaction, {
    actorId,
    initiatorId: actorId,
    key: input.idempotencyKey,
    hash,
    quoteId: input.quoteId ?? null,
    calculation: await confirmQuote(transaction, actorId, input),
    purpose: input.purpose,
  });
}
export { transferWallet, settleFinancialTransfer };
