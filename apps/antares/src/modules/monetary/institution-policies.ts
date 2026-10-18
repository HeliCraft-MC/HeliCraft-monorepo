import { eq } from 'drizzle-orm';
import { states, institutionPolicyTexts } from '../../db/schema';
import type { monetaryDirectives } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { createText, readText } from '../localized-content/service';
import { readRevision, publishRevision } from '../states/revisions';
import { mergeInstitutionPolicies } from '../states/institution-policies';
import { validateGovernance } from '../states/validation';
import { DomainError, HTTP } from '../errors';
import type { DirectivePayload } from './contracts';

type DirectiveRecord = typeof monetaryDirectives.$inferSelect;

type Establishment = Extract<DirectivePayload, { kind: 'ESTABLISH_BANK' | 'ESTABLISH_TAX_OFFICE' }>;
function stripInitialPolicies(payload: DirectivePayload): DirectivePayload {
  return 'initialPolicies' in payload && payload.initialPolicies !== undefined
    ? {
        ...payload,
        initialPolicies: payload.initialPolicies.map((policy) => ({
          ...policy,
          manualProcedure: {},
        })),
      }
    : payload;
}
async function storeInitialPolicies(
  transaction: Transaction,
  id: string,
  payload: DirectivePayload,
): Promise<void> {
  if (!('initialPolicies' in payload) || payload.initialPolicies === undefined) {
    return;
  }
  /* oxlint-disable no-await-in-loop -- Localized references must be persisted sequentially on one transaction connection. */
  for (const policy of payload.initialPolicies) {
    await transaction.insert(institutionPolicyTexts).values({
      directiveId: id,
      action: policy.action,
      textId: await createText(transaction, policy.manualProcedure),
    });
  }
  /* oxlint-enable no-await-in-loop */
}
async function hydrateInitialPolicies(
  transaction: Transaction,
  id: string,
  payload: DirectivePayload,
): Promise<DirectivePayload> {
  if (!('initialPolicies' in payload) || payload.initialPolicies === undefined) {
    return payload;
  }
  const refs = await transaction
    .select()
    .from(institutionPolicyTexts)
    .where(eq(institutionPolicyTexts.directiveId, id));
  const initialPolicies = await Promise.all(
    payload.initialPolicies.map(async (policy) => {
      const reference = refs.find((ref) => ref.action === policy.action);
      if (reference === undefined) {
        throw new Error('Institution procedure text missing');
      }
      return { ...policy, manualProcedure: await readText(transaction, reference.textId) };
    }),
  );
  return { ...payload, initialPolicies };
}
async function institutionConfiguration(
  transaction: Transaction,
  stateId: string,
  payload: Establishment,
): Promise<Awaited<ReturnType<typeof readRevision>>> {
  const [state] = await transaction.select().from(states).where(eq(states.id, stateId));
  if (state?.currentRevisionId === null || state?.currentRevisionId === undefined) {
    throw new Error('State revision missing');
  }
  const current = await readRevision(transaction, state.currentRevisionId);
  const policies = mergeInstitutionPolicies(
    current.configuration.governance.policies,
    payload.initialPolicies ?? [],
    payload.kind,
  );
  const configuration = {
    ...current.configuration,
    governance: { ...current.configuration.governance, policies },
  };
  const issues = validateGovernance(
    configuration.governance,
    configuration.governance.offices.flatMap((office) => office.initialHolderIds),
  );
  if (issues.some((issue) => issue.severity === 'ERROR')) {
    throw new DomainError(
      HTTP.badRequest,
      'INVALID_INSTITUTION_POLICY',
      'Проверьте процедуры института: должности, порядок одобрения и голосования',
    );
  }
  return { record: current.record, configuration };
}
async function publishInitialPolicies(
  transaction: Transaction,
  input: Readonly<{ record: DirectiveRecord; actorId: string }>,
  payload: DirectivePayload,
): Promise<void> {
  const { record, actorId } = input;
  if (
    !('initialPolicies' in payload) ||
    payload.initialPolicies === undefined ||
    payload.initialPolicies.length === 0
  ) {
    return;
  }
  const current = await institutionConfiguration(transaction, record.stateId, payload);
  const previous = await readRevision(transaction, current.record.id);
  if (
    current.configuration.governance.policies.length ===
    previous.configuration.governance.policies.length
  ) {
    return;
  }
  const id = await publishRevision(transaction, {
    stateId: record.stateId,
    number: current.record.number + 1,
    actorId,
    previousRevisionId: current.record.id,
    adminOverride: false,
    reason: 'Institution procedures established',
    configuration: current.configuration,
  });
  await transaction
    .update(states)
    .set({ currentRevisionId: id })
    .where(eq(states.id, record.stateId));
}
export {
  stripInitialPolicies,
  storeInitialPolicies,
  hydrateInitialPolicies,
  institutionConfiguration,
  publishInitialPolicies,
};
