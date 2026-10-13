// oxlint-disable import/max-dependencies -- This composition module connects typed platform services and reusable UI; domain logic remains in separate modules.
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  stateReformProposals,
  stateReformVotes,
  stateDrafts,
  stateFounders,
  stateMemberships,
  votingEligibleVoters,
  users,
  states,
} from '../../db/schema';
import { authorizeMutation } from '../permissions/transaction';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import type { Locale } from '../localized-content/contracts';
import { renderConstitution } from './constitution-renderer';
import type { z } from '@hono/zod-openapi';
import type { ReformProposalSchema } from './contracts';
import { hydrateReformProposal } from './proposal-store';
import { configurationHash } from './configuration-hash';

type ProposalRecord = typeof stateReformProposals.$inferSelect;
type Proposal = z.infer<typeof ReformProposalSchema>;
async function authorizeProposalRead(
  transaction: Transaction,
  input: Readonly<{ stateId: string; ownerId: string; actorId: string; votingId?: string }>,
): Promise<void> {
  if (input.ownerId === input.actorId) {
    return;
  }
  const [member] = await transaction
    .select()
    .from(stateMemberships)
    .where(
      and(
        eq(stateMemberships.stateId, input.stateId),
        eq(stateMemberships.userId, input.actorId),
        isNull(stateMemberships.endedAt),
      ),
    );
  if (member) {
    return;
  }
  if (input.votingId !== undefined) {
    const [eligible] = await transaction
      .select()
      .from(votingEligibleVoters)
      .where(
        and(
          eq(votingEligibleVoters.votingId, input.votingId),
          eq(votingEligibleVoters.userId, input.actorId),
        ),
      );
    if (eligible) {
      return;
    }
  }
  await authorizeMutation(transaction, input.actorId, 'states.manage');
}
// oxlint-disable-next-line max-lines-per-function -- The read model combines a pinned proposal, status and sanitized document.
async function describeProposal(
  transaction: Transaction,
  record: Readonly<ProposalRecord>,
  locale: Locale,
): Promise<Proposal> {
  const configuration = await hydrateReformProposal(transaction, record);
  const [draft] = await transaction
    .select()
    .from(stateDrafts)
    .where(eq(stateDrafts.id, record.draftId));
  const [state] = await transaction.select().from(states).where(eq(states.id, record.stateId));
  if (!draft || !state) {
    throw new Error('Proposal context missing');
  }
  let status: Proposal['status'] = 'PENDING';
  if (draft.deletedAt !== null) {
    status = 'DELETED';
  } else if (draft.submittedStateId !== null) {
    status =
      configurationHash(draft.configuration) === record.configurationHash
        ? 'PUBLISHED'
        : 'SUPERSEDED';
  } else if (
    configurationHash(draft.configuration) !== record.configurationHash ||
    state.currentRevisionId !== record.baseRevisionId
  ) {
    status = 'SUPERSEDED';
  }
  const [primary] = await transaction
    .select()
    .from(stateFounders)
    .where(and(eq(stateFounders.stateId, record.stateId), eq(stateFounders.type, 'PRIMARY')));
  if (!primary) {
    throw new Error('Primary founder missing');
  }
  const people = await transaction
    .select({ id: users.id, name: users.username })
    .from(users)
    .where(inArray(users.id, [primary.userId, ...configuration.cofounderIds]));
  const founders = people.map((person) => ({
    id: person.id,
    name: person.name,
    type: person.id === primary.userId ? ('PRIMARY' as const) : ('COFOUNDER' as const),
  }));
  const { html } = await renderConstitution(configuration, founders, locale);
  return {
    id: record.id,
    draftId: record.draftId,
    ownerId: record.ownerId,
    stateId: record.stateId,
    version: record.version,
    status,
    configuration,
    founders,
    html,
  };
}
async function readProposal(
  db: Database['db'],
  input: Readonly<{ proposalId: string; actorId: string; locale: Locale }>,
): Promise<Proposal> {
  return await db.transaction(async (transaction) => {
    const [record] = await transaction
      .select()
      .from(stateReformProposals)
      .where(eq(stateReformProposals.id, input.proposalId));
    if (!record) {
      throw new DomainError(HTTP.notFound, 'PROPOSAL_NOT_FOUND', 'Проект реформы не найден');
    }
    await authorizeProposalRead(transaction, {
      stateId: record.stateId,
      ownerId: record.ownerId,
      actorId: input.actorId,
    });
    return await describeProposal(transaction, record, input.locale);
  });
}
async function readReformProposal(
  db: Database['db'],
  input: Readonly<{ votingId: string; actorId: string; locale: Locale }>,
): Promise<Proposal> {
  return await db.transaction(async (transaction) => {
    const [vote] = await transaction
      .select()
      .from(stateReformVotes)
      .where(eq(stateReformVotes.votingId, input.votingId));
    if (!vote) {
      throw new DomainError(HTTP.notFound, 'PROPOSAL_NOT_FOUND', 'Проект реформы не найден');
    }
    const [record] = await transaction
      .select()
      .from(stateReformProposals)
      .where(
        and(
          eq(stateReformProposals.draftId, vote.draftId),
          eq(stateReformProposals.version, vote.version),
        ),
      );
    if (!record) {
      throw new DomainError(HTTP.notFound, 'PROPOSAL_NOT_FOUND', 'Проект реформы не найден');
    }
    await authorizeProposalRead(transaction, {
      stateId: record.stateId,
      ownerId: record.ownerId,
      actorId: input.actorId,
      votingId: input.votingId,
    });
    return await describeProposal(transaction, record, input.locale);
  });
}
async function listReformProposals(
  db: Database['db'],
  stateId: string,
  actorId: string,
): Promise<{ id: string; version: number; createdAt: string }[]> {
  return await db.transaction(async (transaction) => {
    await authorizeProposalRead(transaction, { stateId, ownerId: '', actorId });
    const records = await transaction
      .select()
      .from(stateReformProposals)
      .where(eq(stateReformProposals.stateId, stateId))
      .orderBy(desc(stateReformProposals.createdAt));
    return records.map((record) => ({
      id: record.id,
      version: record.version,
      createdAt: record.createdAt.toISOString(),
    }));
  });
}
export { readProposal, readReformProposal, listReformProposals };
