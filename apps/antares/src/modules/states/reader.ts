import { holderHasAuthority } from './office-authority';
import { and, eq, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import {
  stateGovernanceRevisions,
  stateFounders,
  stateMemberships,
  stateOfficeHolders,
  stateOffices,
  stateConstitutionRevisions,
  users,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { authorizeMutation } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { renderConstitution } from './constitution-renderer';
import type { Locale } from '../localized-content/contracts';
import { readRevision } from './revisions';
import { stateRecord } from './persistence';
import type { StateConfiguration, StateDetail } from './contracts';

interface StateReadAccess {
  readonly actorId?: string;
  readonly admin?: boolean;
  readonly revisionId?: string;
}
async function authorizeRead(
  transaction: Transaction,
  input: Readonly<{ stateId: string; status: StateDetail['status']; access: StateReadAccess }>,
): Promise<void> {
  const { stateId, status, access } = input;
  if (access.admin === true) {
    return;
  }
  if (status === 'ACTIVE' && access.actorId === undefined) {
    return;
  }
  if (access.actorId !== undefined) {
    const [founder] = await transaction
      .select()
      .from(stateFounders)
      .where(and(eq(stateFounders.stateId, stateId), eq(stateFounders.userId, access.actorId)));
    if (founder) {
      return;
    }
  }
  if (
    (status === 'ACTIVE' || status === 'SUSPENDED' || status === 'DORMANT') &&
    access.actorId !== undefined
  ) {
    const [member] = await transaction
      .select()
      .from(stateMemberships)
      .where(
        and(
          eq(stateMemberships.stateId, stateId),
          eq(stateMemberships.userId, access.actorId),
          isNull(stateMemberships.endedAt),
        ),
      );
    if (member) {
      return;
    }
  }
  throw new DomainError(HTTP.notFound, 'STATE_NOT_FOUND', 'Государство не найдено');
}
async function readFounders(
  transaction: Transaction,
  configuration: Readonly<StateConfiguration>,
  stateId: string,
): Promise<StateDetail['founders']> {
  const [primary] = await transaction
    .select()
    .from(stateFounders)
    .where(and(eq(stateFounders.stateId, stateId), eq(stateFounders.type, 'PRIMARY')));
  if (!primary) {
    throw new Error('Primary founder missing');
  }
  const people = await transaction
    .select({ id: users.id, name: users.username })
    .from(users)
    .where(inArray(users.id, [primary.userId, ...configuration.cofounderIds]));
  return people.map((person) => ({
    id: person.id,
    name: person.name,
    type: person.id === primary.userId ? 'PRIMARY' : 'COFOUNDER',
  }));
}
// oxlint-disable-next-line max-lines-per-function -- Pinned holder and citizenship intervals form one historical read model.
async function readPopulation(
  transaction: Transaction,
  input: Readonly<{
    stateId: string;
    configuration: StateConfiguration;
    at: Date | null;
    revisionId: string;
  }>,
): Promise<Pick<StateDetail, 'citizens' | 'holders'>> {
  const exactTime = sql`(select ${stateGovernanceRevisions.createdAt} from ${stateGovernanceRevisions} where ${stateGovernanceRevisions.id} = ${input.revisionId})`;
  const membershipWindow =
    input.at === null
      ? isNull(stateMemberships.endedAt)
      : and(
          lte(stateMemberships.joinedAt, exactTime),
          or(isNull(stateMemberships.endedAt), gt(stateMemberships.endedAt, exactTime)),
        );
  const holderWindow =
    input.at === null
      ? isNull(stateOfficeHolders.until)
      : and(
          lte(stateOfficeHolders.since, exactTime),
          or(isNull(stateOfficeHolders.until), gt(stateOfficeHolders.until, exactTime)),
        );
  const citizens = await transaction
    .select({ id: users.id, name: users.username })
    .from(stateMemberships)
    .innerJoin(users, eq(users.id, stateMemberships.userId))
    .where(and(eq(stateMemberships.stateId, input.stateId), membershipWindow))
    .orderBy(stateMemberships.joinedAt, users.id);
  const holders = await transaction
    .select({
      officeId: stateOfficeHolders.officeId,
      userId: users.id,
      name: users.username,
      since: stateOfficeHolders.since,
    })
    .from(stateOfficeHolders)
    .innerJoin(stateOffices, eq(stateOffices.id, stateOfficeHolders.officeId))
    .innerJoin(users, eq(users.id, stateOfficeHolders.userId))
    .where(
      and(
        eq(stateOffices.stateId, input.stateId),
        inArray(
          stateOffices.id,
          input.configuration.governance.offices.map((office) => office.id),
        ),
        holderWindow,
      ),
    );
  return {
    citizens,
    holders: holders
      .filter((holder) => {
        const office = input.configuration.governance.offices.find(
          (item) => item.id === holder.officeId,
        );
        return (
          office !== undefined && holderHasAuthority(office, holder.since, input.at ?? new Date())
        );
      })
      .map((holder) => ({
        officeId: holder.officeId,
        userId: holder.userId,
        name: holder.name,
        since: holder.since.toISOString(),
      })),
  };
}
function withoutMarkdown(configuration: Readonly<StateConfiguration>): StateConfiguration {
  return {
    ...configuration,
    constitution:
      configuration.constitution === null
        ? null
        : {
            ...configuration.constitution,
            blocks: configuration.constitution.blocks.map((block) =>
              block.type === 'MARKDOWN' ? { ...block, content: {} } : block,
            ),
          },
  };
}
// oxlint-disable-next-line max-lines-per-function -- Authorization and the pinned revision are read under the same state lock.
async function readStateDetail(
  transaction: Transaction,
  input: Readonly<{ id: string; locale: Locale; access: StateReadAccess }>,
): Promise<StateDetail> {
  if (input.access.admin === true) {
    if (input.access.actorId === undefined) {
      throw new DomainError(HTTP.unauthenticated, 'UNAUTHENTICATED', 'Войдите в аккаунт');
    }
    await authorizeMutation(transaction, input.access.actorId, 'states.manage');
  }
  const record = await stateRecord(transaction, input.id);
  await authorizeRead(transaction, {
    stateId: record.id,
    status: record.status,
    access: input.access,
  });
  const pinnedId = input.access.revisionId ?? record.currentRevisionId;
  if (pinnedId === null) {
    throw new Error('State has no published governance');
  }
  const revision = await readRevision(transaction, pinnedId);
  if (revision.record.stateId !== record.id) {
    throw new DomainError(HTTP.notFound, 'REVISION_NOT_FOUND', 'Редакция не найдена');
  }
  const founders = await readFounders(transaction, revision.configuration, record.id);
  const population = await readPopulation(transaction, {
    stateId: record.id,
    configuration: revision.configuration,
    revisionId: pinnedId,
    at: input.access.revisionId === undefined ? null : revision.record.createdAt,
  });
  const [constitution] = await transaction
    .select()
    .from(stateConstitutionRevisions)
    .where(eq(stateConstitutionRevisions.governanceRevisionId, pinnedId));
  const { html: constitutionHtml } = await renderConstitution(
    revision.configuration,
    founders,
    input.locale,
  );
  return {
    id: record.id,
    slug: record.slug,
    status: record.status,
    statusReason: record.statusReason,
    configuration:
      input.access.actorId === undefined
        ? withoutMarkdown(revision.configuration)
        : revision.configuration,
    founders,
    ...population,
    governanceRevisionId: pinnedId,
    governanceRevision: revision.record.number,
    constitutionRevisionId: constitution?.id ?? null,
    createdAt: record.createdAt.toISOString(),
    constitutionHtml,
  };
}
export { readStateDetail, type StateReadAccess };
