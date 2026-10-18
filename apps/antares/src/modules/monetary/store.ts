import {
  stripInitialPolicies,
  storeInitialPolicies,
  hydrateInitialPolicies,
} from './institution-policies';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  economicDirectiveDocuments,
  users,
  currencies,
  centralBanks,
  monetaryDirectives,
  monetaryPolicyRevisions,
  adminAuditLog,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { authorizeMutation } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { readText, createText } from '../localized-content/service';
import type { DirectivePayload, MonetaryActor } from './contracts';
import { monetaryError } from './domain';

type DirectiveRecord = typeof monetaryDirectives.$inferSelect;
type CurrencyRecord = typeof currencies.$inferSelect;
type BankRecord = typeof centralBanks.$inferSelect;
const AUTHORIZATION_LOCK = 741_022;
async function monetaryActor(transaction: Transaction, actor: MonetaryActor): Promise<void> {
  // Same lock/order as platform role/status mutations; V1 deliberately serializes monetary commands.
  await transaction.execute(sql`select pg_advisory_xact_lock(${AUTHORIZATION_LOCK})`);
  if (actor.admin) {
    await authorizeMutation(transaction, actor.id, 'states.manage');
  }
  const [user] = await transaction
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, actor.id));
  if (user?.status !== 'ACTIVE') {
    throw new DomainError(HTTP.forbidden, 'ACTOR_INACTIVE', 'Аккаунт недоступен');
  }
}
async function bankRecord(transaction: Transaction, stateId: string): Promise<BankRecord | null> {
  const [bank] = await transaction
    .select()
    .from(centralBanks)
    .where(eq(centralBanks.stateId, stateId))
    .for('update');
  return bank ?? null;
}
async function currencyRecord(transaction: Transaction, id: string): Promise<CurrencyRecord> {
  const [currency] = await transaction
    .select()
    .from(currencies)
    .where(eq(currencies.id, id))
    .for('update');
  if (!currency) {
    throw new DomainError(HTTP.notFound, 'CURRENCY_NOT_FOUND', 'Валюта не найдена');
  }
  return currency;
}
async function currentPolicy(
  transaction: Transaction,
  currencyId: string,
): Promise<typeof monetaryPolicyRevisions.$inferSelect | null> {
  const [policy] = await transaction
    .select()
    .from(monetaryPolicyRevisions)
    .where(eq(monetaryPolicyRevisions.currencyId, currencyId))
    .orderBy(desc(monetaryPolicyRevisions.number))
    .limit(1);
  return policy ?? null;
}
async function directiveRecord(transaction: Transaction, id: string): Promise<DirectiveRecord> {
  const [record] = await transaction
    .select()
    .from(monetaryDirectives)
    .where(eq(monetaryDirectives.id, id));
  if (!record) {
    throw new DomainError(HTTP.notFound, 'DIRECTIVE_NOT_FOUND', 'Распоряжение не найдено');
  }
  return record;
}
async function hydratePayload(
  transaction: Transaction,
  record: DirectiveRecord,
): Promise<DirectivePayload> {
  const { payload } = record;
  const identity =
    'name' in payload && record.nameTextId !== null && record.descriptionTextId !== null
      ? {
          name: await readText(transaction, record.nameTextId),
          description: await readText(transaction, record.descriptionTextId),
        }
      : null;
  const [document] =
    'document' in payload
      ? await transaction
          .select()
          .from(economicDirectiveDocuments)
          .where(eq(economicDirectiveDocuments.directiveId, record.id))
      : [];
  if ('document' in payload && document !== undefined && identity !== null) {
    return { ...payload, ...identity, document: await readText(transaction, document.textId) };
  }
  return await hydrateInitialPolicies(
    transaction,
    record.id,
    identity !== null && 'name' in payload ? { ...payload, ...identity } : payload,
  );
}
async function storePayload(
  transaction: Transaction,
  payload: DirectivePayload,
): Promise<{
  payload: DirectivePayload;
  nameTextId: string | null;
  descriptionTextId: string | null;
  documentTextId: string | null;
}> {
  const nameTextId = 'name' in payload ? await createText(transaction, payload.name) : null;
  const descriptionTextId =
    'description' in payload ? await createText(transaction, payload.description) : null;
  const documentTextId =
    'document' in payload ? await createText(transaction, payload.document) : null;
  const stripped = 'name' in payload ? { ...payload, name: {}, description: {} } : payload;
  return {
    payload: stripInitialPolicies(
      'document' in stripped ? { ...stripped, document: {} } : stripped,
    ),
    nameTextId,
    descriptionTextId,
    documentTextId,
  };
}
async function storeDirectiveDocument(
  transaction: Transaction,
  directiveId: string,
  payload: DirectivePayload,
): Promise<void> {
  await storeInitialPolicies(transaction, directiveId, payload);
  if ('document' in payload) {
    await transaction
      .insert(economicDirectiveDocuments)
      .values({ directiveId, textId: await createText(transaction, payload.document) });
  }
}
async function monetaryAudit(
  transaction: Transaction,
  entry: Readonly<{ actorId: string; id: string; action: string; reason?: string }>,
): Promise<void> {
  await transaction.insert(adminAuditLog).values({
    actorId: entry.actorId,
    targetId: entry.id,
    targetType: 'MONETARY',
    action: entry.action,
    metadata: { reason: entry.reason ?? '' },
  });
}
function directiveCurrencyId(payload: DirectivePayload): string {
  if (!('currencyId' in payload)) {
    throw new Error('Currency payload required');
  }
  return payload.currencyId;
}
async function assertBankCurrency(
  transaction: Transaction,
  stateId: string,
  payload: DirectivePayload,
): Promise<{ bank: BankRecord | null; currency: CurrencyRecord | null }> {
  const bank = await bankRecord(transaction, stateId);
  if (payload.kind === 'ESTABLISH_BANK') {
    if (bank !== null && bank.status !== 'REJECTED') {
      monetaryError('BANK_EXISTS', 'Центральный банк уже учреждён или ожидает одобрения');
    }
    return { bank, currency: null };
  }
  if (bank?.status !== 'ACTIVE') {
    monetaryError('BANK_INACTIVE', 'Для этой операции требуется активный Центральный банк');
  }
  if (payload.kind === 'CHANGE_CHARTER') {
    return { bank, currency: null };
  }
  if (payload.kind === 'CREATE_CURRENCY') {
    const [existing] = await transaction
      .select({ id: currencies.id })
      .from(currencies)
      .where(eq(currencies.stateId, stateId));
    const [code] = await transaction
      .select({ id: currencies.id })
      .from(currencies)
      .where(eq(currencies.code, payload.code));
    if (existing || code) {
      monetaryError('CURRENCY_EXISTS', 'Валюта государства или код уже зарегистрированы');
    }
    return { bank, currency: null };
  }
  const currency = await currencyRecord(transaction, directiveCurrencyId(payload));
  if (currency.stateId !== stateId || currency.bankId !== bank.id || currency.status !== 'ACTIVE') {
    monetaryError('CURRENCY_UNAVAILABLE', 'Валюта не принадлежит этому банку или заблокирована');
  }
  return { bank, currency };
}
async function previousDirective(
  transaction: Transaction,
  actorId: string,
  key: string,
): Promise<DirectiveRecord | null> {
  const [record] = await transaction
    .select()
    .from(monetaryDirectives)
    .where(
      and(eq(monetaryDirectives.createdBy, actorId), eq(monetaryDirectives.idempotencyKey, key)),
    );
  return record ?? null;
}
export {
  monetaryActor,
  bankRecord,
  currencyRecord,
  currentPolicy,
  directiveRecord,
  hydratePayload,
  storePayload,
  storeDirectiveDocument,
  monetaryAudit,
  assertBankCurrency,
  previousDirective,
  type DirectiveRecord,
  type CurrencyRecord,
  type BankRecord,
};
