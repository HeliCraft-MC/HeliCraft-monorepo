// oxlint-disable import/max-dependencies -- Bilateral financial consent reuses current state Governance proofs and the exact shared ledger settlement.
import { and, desc, eq } from 'drizzle-orm';
import {
  financialAccounts,
  fxInterbankApprovals,
  fxInterbankTrades,
  monetaryDirectives,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { monetaryHash, monetaryError } from '../monetary/domain';
import type { DirectiveRecord } from '../monetary/store';
import { directiveProofs } from '../monetary/directive-proofs';
import type { FxDirective, InterbankTerms } from './contracts';
import { assertInterbankTerms } from './domain';
import { activeFxBank, activeFxCurrency, tradeRecord } from './store';
import { assertAvailableBankFunds } from './reserves';
import { settleFx } from './settlement';

type ApprovalPayload = Extract<FxDirective, { kind: 'APPROVE_INTERBANK_EXCHANGE' }>;
async function assertInterbankFunds(
  transaction: Transaction,
  leg: InterbankTerms['first'],
): Promise<void> {
  const [source] = await transaction
    .select({ balance: financialAccounts.balanceMinor })
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.kind, 'CENTRAL_BANK'),
        eq(financialAccounts.ownerId, leg.bankId),
        eq(financialAccounts.currencyId, leg.currencyId),
      ),
    );
  await assertAvailableBankFunds(transaction, {
    bankId: leg.bankId,
    currencyId: leg.currencyId,
    balanceMinor: source?.balance ?? '0',
    amountMinor: leg.amountMinor,
  });
}
async function assertInterbankApproval(
  transaction: Transaction,
  stateId: string,
  payload: ApprovalPayload,
): Promise<void> {
  const { terms } = payload;
  assertInterbankTerms(terms);
  if (stateId !== terms.first.stateId && stateId !== terms.second.stateId) {
    monetaryError('FX_TRADE_FOREIGN', 'Государство не является стороной этой сделки');
  }
  await activeFxBank(transaction, terms.first.stateId, terms.first.bankId);
  await activeFxBank(transaction, terms.second.stateId, terms.second.bankId);
  await activeFxCurrency(transaction, terms.first.currencyId);
  await activeFxCurrency(transaction, terms.second.currencyId);
  const prior = await tradeRecord(transaction, payload.tradeId);
  if (prior !== null && (prior.termsHash !== monetaryHash(terms) || prior.status !== 'PENDING')) {
    monetaryError(
      'FX_TRADE_STALE',
      'Сделка уже исполнена или этот идентификатор закреплён за другими условиями',
    );
  }
  await assertInterbankFunds(
    transaction,
    stateId === terms.first.stateId ? terms.first : terms.second,
  );
}
async function currentOtherApproval(
  transaction: Transaction,
  payload: ApprovalPayload,
  stateId: string,
): Promise<string | null> {
  const rows = await transaction
    .select({ directive: monetaryDirectives })
    .from(fxInterbankApprovals)
    .innerJoin(monetaryDirectives, eq(monetaryDirectives.id, fxInterbankApprovals.directiveId))
    .where(
      and(
        eq(fxInterbankApprovals.tradeId, payload.tradeId),
        eq(fxInterbankApprovals.stateId, stateId),
      ),
    )
    .orderBy(desc(fxInterbankApprovals.createdAt), desc(fxInterbankApprovals.directiveId));
  for (const { directive } of rows) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- Only exact continuously valid consent by the other state's own Governance can complete this trade.
      const proof = await directiveProofs(transaction, directive.id, {
        id: directive.createdBy,
        admin: false,
      });
      if (
        proof.record.status === 'APPLIED' &&
        proof.ready &&
        proof.payload.kind === 'APPROVE_INTERBANK_EXCHANGE' &&
        proof.payload.tradeId === payload.tradeId &&
        monetaryHash(proof.payload.terms) === monetaryHash(payload.terms)
      ) {
        return directive.id;
      }
    } catch (error) {
      if (
        !(error instanceof DomainError) ||
        (error.status !== HTTP.forbidden && error.status !== HTTP.notFound)
      ) {
        throw error;
      }
    }
  }
  return null;
}
async function settleInterbank(
  transaction: Transaction,
  input: Readonly<{
    record: DirectiveRecord;
    actorId: string;
    payload: ApprovalPayload;
    otherId: string;
  }>,
): Promise<void> {
  const { record, actorId, payload, otherId } = input;
  const { terms } = payload;
  await assertInterbankFunds(transaction, terms.first);
  await assertInterbankFunds(transaction, terms.second);
  await settleFx(transaction, {
    id: crypto.randomUUID(),
    actorId,
    key: record.id,
    hash: monetaryHash({ tradeId: payload.tradeId, terms }),
    source: {
      tradeId: payload.tradeId,
      firstApprovalId: record.stateId === terms.first.stateId ? record.id : otherId,
      secondApprovalId: record.stateId === terms.second.stateId ? record.id : otherId,
    },
    receive: {
      currencyId: terms.first.currencyId,
      amountMinor: terms.first.amountMinor,
      from: { kind: 'CENTRAL_BANK', id: terms.first.bankId },
      to: { kind: 'CENTRAL_BANK', id: terms.second.bankId },
    },
    provide: {
      currencyId: terms.second.currencyId,
      amountMinor: terms.second.amountMinor,
      from: { kind: 'CENTRAL_BANK', id: terms.second.bankId },
      to: { kind: 'CENTRAL_BANK', id: terms.first.bankId },
    },
  });
  await transaction
    .update(fxInterbankTrades)
    .set({ status: 'SETTLED' })
    .where(eq(fxInterbankTrades.id, payload.tradeId));
}
async function approveInterbank(
  transaction: Transaction,
  input: Readonly<{ record: DirectiveRecord; actorId: string }>,
  payload: ApprovalPayload,
): Promise<void> {
  const { record, actorId } = input;
  await assertInterbankApproval(transaction, record.stateId, payload);
  const { terms } = payload;
  if ((await tradeRecord(transaction, payload.tradeId)) === null) {
    await transaction.insert(fxInterbankTrades).values({
      id: payload.tradeId,
      terms,
      termsHash: monetaryHash(terms),
      firstStateId: terms.first.stateId,
      secondStateId: terms.second.stateId,
    });
  }
  await transaction
    .insert(fxInterbankApprovals)
    .values({ directiveId: record.id, tradeId: payload.tradeId, stateId: record.stateId, actorId });
  const otherId = await currentOtherApproval(
    transaction,
    payload,
    record.stateId === terms.first.stateId ? terms.second.stateId : terms.first.stateId,
  );
  if (otherId === null) {
    return;
  }
  await settleInterbank(transaction, { ...input, payload, otherId });
}
export { assertInterbankApproval, approveInterbank };
