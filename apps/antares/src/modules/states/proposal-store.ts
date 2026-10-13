// oxlint-disable import/max-dependencies -- This composition module connects typed platform services and reusable UI; domain logic remains in separate modules.
import { configurationHash } from './configuration-hash';
// oxlint-disable no-await-in-loop -- Normalized proposal texts and their foreign-key references use one ordered transaction connection.
import { and, eq } from 'drizzle-orm';
import { stateReformProposals, stateReformProposalTexts, stateFounders } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { createText, readText } from '../localized-content/service';
import type { LocalizedInput } from '../localized-content/contracts';
import { DomainError, HTTP } from '../errors';
import { validatePersistent } from './persistence';
import { extractTexts, hydrateTexts } from './localized-snapshot';
import type { contextForDraft } from './reform-context';
import type { StateConfiguration } from './contracts';

type ReformContext = Awaited<ReturnType<typeof contextForDraft>>;
// oxlint-disable-next-line max-lines-per-function -- Immutable normalized proposal creation is atomic.
async function ensureReformProposal(
  transaction: Transaction,
  context: ReformContext,
): Promise<string> {
  const [existing] = await transaction
    .select()
    .from(stateReformProposals)
    .where(
      and(
        eq(stateReformProposals.draftId, context.draft.id),
        eq(stateReformProposals.configurationHash, configurationHash(context.draft.configuration)),
        eq(
          stateReformProposals.baseRevisionId,
          context.draft.baseRevisionId ?? context.state.currentRevisionId ?? '',
        ),
      ),
    );
  if (existing) {
    return existing.id;
  }
  const [primary] = await transaction
    .select()
    .from(stateFounders)
    .where(and(eq(stateFounders.stateId, context.state.id), eq(stateFounders.type, 'PRIMARY')));
  if (!primary || context.draft.baseRevisionId === null) {
    throw new Error('Missing reform context');
  }
  const issues = await validatePersistent(transaction, context.draft.configuration, {
    primaryFounderId: primary.userId,
    mediaOwnerId: context.draft.ownerId,
    stateId: context.state.id,
  });
  if (issues.some((issue) => issue.severity === 'ERROR')) {
    throw new DomainError(
      HTTP.badRequest,
      'INVALID_STATE',
      issues
        .filter((issue) => issue.severity === 'ERROR')
        .map((issue) => issue.message)
        .join('; '),
    );
  }
  const id = crypto.randomUUID();
  const extracted = extractTexts(context.draft.configuration);
  await transaction.insert(stateReformProposals).values({
    id,
    draftId: context.draft.id,
    version: context.draft.version,
    stateId: context.state.id,
    baseRevisionId: context.draft.baseRevisionId,
    ownerId: context.draft.ownerId,
    configurationHash: configurationHash(context.draft.configuration),
    configuration: extracted.machine,
  });
  for (const [path, values] of extracted.texts) {
    await transaction
      .insert(stateReformProposalTexts)
      .values({ proposalId: id, path, textId: await createText(transaction, values) });
  }
  return id;
}
async function hydrateReformProposal(
  transaction: Transaction,
  record: Readonly<typeof stateReformProposals.$inferSelect>,
): Promise<StateConfiguration> {
  const refs = await transaction
    .select()
    .from(stateReformProposalTexts)
    .where(eq(stateReformProposalTexts.proposalId, record.id));
  const texts = new Map<string, LocalizedInput>();
  for (const ref of refs) {
    texts.set(ref.path, await readText(transaction, ref.textId));
  }
  return hydrateTexts(record.configuration, texts);
}
export { ensureReformProposal, hydrateReformProposal };
