// oxlint-disable import/max-dependencies -- Approved treasury or taxable corporate payments share the existing ledger, exact quotes and jurisdiction checks.
import { and, eq } from 'drizzle-orm';
import { financialAccounts } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { monetaryHash } from '../monetary/domain';
import { currencyRecord } from '../monetary/store';
import { account, companyAccount, post } from '../monetary/ledger';
import { stateRecord } from '../states/persistence';
import type { CompanyDecisionPayload } from './decision-contracts';
import type { CompanyProofs } from './decision-proofs';
import { assertFinancialParty } from '../taxation/party-store';
import { settleFinancialTransfer } from '../taxation/settlement';
import { confirmCorporateQuote } from './payment-quote';

type CorporatePayment = Extract<CompanyDecisionPayload, { kind: 'TRANSFER_FUNDS' }>;
async function assertCorporatePayment(
  transaction: Transaction,
  companyId: string,
  payload: CorporatePayment,
): Promise<void> {
  const currency = await currencyRecord(transaction, payload.currencyId);
  if (currency.status !== 'ACTIVE') {
    throw new DomainError(HTTP.conflict, 'CURRENCY_BLOCKED', 'Переводы этой валюты приостановлены');
  }
  if (payload.recipient.type === 'STATE') {
    const recipient = await stateRecord(transaction, payload.recipient.id);
    if (recipient.status !== 'ACTIVE') {
      throw new DomainError(
        HTTP.conflict,
        'RECIPIENT_UNAVAILABLE',
        'Принимающее государство не активно',
      );
    }
  } else {
    if (payload.recipient.id === companyId) {
      throw new DomainError(HTTP.conflict, 'SAME_ACCOUNT', 'Выберите другого получателя');
    }
    await assertFinancialParty(transaction, {
      kind: payload.recipient.type,
      id: payload.recipient.id,
    });
  }
  const [source] = await transaction
    .select({ balance: financialAccounts.balanceMinor })
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.kind, 'COMPANY'),
        eq(financialAccounts.ownerId, companyId),
        eq(financialAccounts.currencyId, currency.id),
      ),
    );
  if (BigInt(source?.balance ?? '0') < BigInt(payload.approvedDebitMinor ?? payload.amountMinor)) {
    throw new DomainError(HTTP.conflict, 'INSUFFICIENT_FUNDS', 'Недостаточно средств компании');
  }
}
async function executeCorporatePayment(
  transaction: Transaction,
  input: Readonly<{ proof: CompanyProofs; payload: CorporatePayment; actorId: string }>,
): Promise<void> {
  const { proof, payload, actorId } = input;
  await assertCorporatePayment(transaction, proof.company.id, payload);
  if (payload.recipient.type !== 'STATE') {
    const calculation = await confirmCorporateQuote(transaction, {
      companyId: proof.company.id,
      revisionId: proof.record.revisionId,
      actorId: proof.record.createdBy,
      proposedAt: proof.record.createdAt,
      payload,
    });
    await settleFinancialTransfer(transaction, {
      actorId,
      initiatorId: proof.record.createdBy,
      key: proof.record.id,
      hash: monetaryHash({ companyDecisionId: proof.record.id }),
      quoteId: payload.quoteId ?? null,
      companyDecisionId: proof.record.id,
      calculation,
      purpose: payload.purpose,
    });
    return;
  }
  const currency = await currencyRecord(transaction, payload.currencyId);
  await post(transaction, {
    actorId,
    key: proof.record.id,
    hash: monetaryHash({ companyDecisionId: proof.record.id }),
    currency,
    kind: 'TRANSFER',
    amountMinor: payload.amountMinor,
    purpose: payload.purpose,
    source: await companyAccount(transaction, currency.id, proof.company.id),
    target: await account(transaction, {
      currencyId: currency.id,
      kind: 'TREASURY',
      ownerId: payload.recipient.id,
    }),
    directiveId: null,
    companyDecisionId: proof.record.id,
    policyRevisionId: null,
  });
}
export { assertCorporatePayment, executeCorporatePayment };
