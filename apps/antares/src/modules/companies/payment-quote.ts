// oxlint-disable import/max-dependencies -- Corporate quotes bind current authority, immutable terms, typed legal parties and the shared Tax Engine.
import { eq } from 'drizzle-orm';
import { transferQuotes } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { monetaryError, monetaryHash } from '../monetary/domain';
import { currencyRecord } from '../monetary/store';
import { financialTransferCalculation } from '../taxation/context';
import { assertFinancialParty } from '../taxation/party-store';
import { storeTransferQuote } from '../taxation/quotes';
import type { TaxCalculation } from '../taxation/contracts';
import type { FinancialTransfer } from '../taxation/participants';
import { companyRecord } from './store';
import { readCompanyRevision } from './revisions';
import { companyHolders, decisionProcedures, procedureActor } from './decision-authority';
import { currentShareholderParticipant } from './shareholder-access';
import { assertCompanyFinanceReader } from './finance-access';
import type { CompanyDecisionPayload } from './decision-contracts';

type CorporatePayment = Extract<CompanyDecisionPayload, { kind: 'TRANSFER_FUNDS' }>;
interface CorporateQuoteRequest {
  readonly companyId: string;
  readonly revisionId: string;
  readonly actorId: string;
  readonly payload: CorporatePayment;
  readonly proposedAt?: Date;
}
function corporateTransfer(companyId: string, payload: CorporatePayment): FinancialTransfer {
  if (payload.recipient.type === 'STATE') {
    monetaryError(
      'NOT_A_TAXABLE_TRANSFER',
      'Официальное перечисление казначейству не является обычным переводом',
    );
  }
  return {
    sender: { kind: 'COMPANY', id: companyId },
    recipient: { kind: payload.recipient.type, id: payload.recipient.id },
    currencyId: payload.currencyId,
    amountMinor: payload.amountMinor,
    purpose: payload.purpose,
    ...(payload.sourceBranchId === undefined ? {} : { sourceBranchId: payload.sourceBranchId }),
  };
}
function corporateQuoteHash(input: CorporateQuoteRequest): string {
  const { quoteId: unusedQuote, approvedDebitMinor: unusedDebit, ...payload } = input.payload;
  void unusedQuote;
  void unusedDebit;
  return monetaryHash({ companyId: input.companyId, revisionId: input.revisionId, payload });
}
async function corporateQuoteCalculation(
  transaction: Transaction,
  input: CorporateQuoteRequest,
): Promise<TaxCalculation> {
  const event = corporateTransfer(input.companyId, input.payload);
  const currency = await currencyRecord(transaction, event.currencyId);
  if (currency.status !== 'ACTIVE' || event.sender.id === event.recipient.id) {
    monetaryError('TRANSFER_UNAVAILABLE', 'Выберите другого получателя и действующую валюту');
  }
  await assertFinancialParty(transaction, event.sender);
  await assertFinancialParty(transaction, event.recipient);
  return await financialTransferCalculation(transaction, event);
}
async function createCorporateQuote(
  transaction: Transaction,
  input: CorporateQuoteRequest,
): Promise<Awaited<ReturnType<typeof storeTransferQuote>>> {
  const company = await companyRecord(transaction, input.companyId);
  if (company.status !== 'ACTIVE' || company.currentRevisionId !== input.revisionId) {
    monetaryError('COMPANY_CHARTER_STALE', 'Компания не активна или редакция устава изменилась');
  }
  await assertCompanyFinanceReader(transaction, company.id, { id: input.actorId, admin: false });
  const calculation = await corporateQuoteCalculation(transaction, input);
  const { content } = await readCompanyRevision(transaction, input.revisionId);
  const [procedure] = decisionProcedures(content.charter, {
    ...input.payload,
    approvedDebitMinor: calculation.totalDebitMinor,
  });
  if (
    procedure === undefined ||
    !procedureActor(procedure, {
      actorId: input.actorId,
      shareholder: await currentShareholderParticipant(transaction, company.id, input.actorId),
      holders: await companyHolders(transaction, company.id),
    })
  ) {
    monetaryError(
      'COMPANY_AUTHORITY_REQUIRED',
      'Требуется действительное финансовое полномочие компании',
    );
  }
  return await storeTransferQuote(transaction, {
    actorId: input.actorId,
    commandHash: corporateQuoteHash(input),
    calculation,
  });
}
async function confirmCorporateQuote(
  transaction: Transaction,
  input: CorporateQuoteRequest,
): Promise<TaxCalculation> {
  const calculation = await corporateQuoteCalculation(transaction, input);
  const [quote] =
    input.payload.quoteId === undefined
      ? []
      : await transaction
          .select()
          .from(transferQuotes)
          .where(eq(transferQuotes.id, input.payload.quoteId));
  if (
    !quote ||
    quote.actorId !== input.actorId ||
    quote.commandHash !== corporateQuoteHash(input) ||
    quote.expiresAt.getTime() <= (input.proposedAt?.getTime() ?? Date.now()) ||
    quote.createdAt.getTime() > (input.proposedAt?.getTime() ?? Date.now()) ||
    quote.calculationHash !== monetaryHash(calculation) ||
    input.payload.approvedDebitMinor !== calculation.totalDebitMinor
  ) {
    monetaryError(
      'TAX_QUOTE_STALE',
      'Подтверждённый корпоративный расчёт отсутствует или условия изменились. Требуется новое решение с новым расчётом',
    );
  }
  return calculation;
}
async function assertCorporateProposalQuote(
  transaction: Transaction,
  input: CorporateQuoteRequest,
): Promise<void> {
  if (input.payload.recipient.type !== 'STATE') {
    await confirmCorporateQuote(transaction, input);
    return;
  }
  if (
    input.payload.quoteId !== undefined ||
    input.payload.sourceBranchId !== undefined ||
    (input.payload.approvedDebitMinor !== undefined &&
      input.payload.approvedDebitMinor !== input.payload.amountMinor)
  ) {
    monetaryError(
      'CORPORATE_PAYMENT_TERMS_INVALID',
      'Перечисление казначейству должно утверждать полную сумму без подмены расчёта или контекста',
    );
  }
}
export {
  createCorporateQuote,
  confirmCorporateQuote,
  assertCorporateProposalQuote,
  corporateQuoteHash,
  type CorporatePayment,
};
