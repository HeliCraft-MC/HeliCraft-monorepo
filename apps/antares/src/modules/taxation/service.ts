// oxlint-disable import/max-dependencies -- Protected/public reads combine state access, normalized text, rendering and exact financial evidence.
import { and, eq, inArray } from 'drizzle-orm';
import type { z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { taxOffices, taxLaws, economicOperations, economicJournals, states } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { assignmentState } from '../states/office-assignment-context';
import { monetaryActor } from '../monetary/store';
import type { MonetaryActor } from '../monetary/contracts';
import { DomainError, HTTP } from '../errors';
import { resolveText } from '../localized-content/contracts';
import type { Locale } from '../localized-content/contracts';
import { renderMarkdown } from '../content/markdown';
import { HISTORY_LIMIT } from '../monetary/read-models';
import { stateTaxationDto, stateLawRevisions, taxOfficeDto, currentStateLaws } from './read-models';
import { assertOperationReader } from './operation-access';
import type {
  StateTaxationSchema,
  PublicTaxationSchema,
  PublicLawRevisionSchema,
  EconomicOperationSchema,
  LawRevisionSchema,
} from './read-contracts';

async function publicLaw(
  revision: z.infer<typeof LawRevisionSchema>,
  locale: Locale,
): Promise<z.infer<typeof PublicLawRevisionSchema>> {
  const { document, ...rest } = revision;
  return { ...rest, documentHtml: await renderMarkdown(resolveText(document, locale).value) };
}
async function publicOffice(
  transaction: Transaction,
  stateId: string,
): Promise<typeof taxOffices.$inferSelect> {
  const [record] = await transaction
    .select({ office: taxOffices })
    .from(taxOffices)
    .innerJoin(states, eq(states.id, taxOffices.stateId))
    .where(
      and(
        eq(states.id, stateId),
        eq(states.status, 'ACTIVE'),
        inArray(taxOffices.status, ['ACTIVE', 'SUSPENDED']),
      ),
    );
  if (!record) {
    throw new DomainError(
      HTTP.notFound,
      'TAX_OFFICE_NOT_FOUND',
      'Действующая налоговая служба не найдена',
    );
  }
  return record.office;
}
class TaxationService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async state(
    stateId: string,
    actor: MonetaryActor,
    page = 1,
  ): Promise<z.infer<typeof StateTaxationSchema>> {
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, actor);
      await assignmentState(transaction, stateId, actor);
      return await stateTaxationDto(transaction, stateId, actor, page);
    });
  }
  public async operation(
    id: string,
    actorId: string,
    admin = false,
  ): Promise<z.infer<typeof EconomicOperationSchema>> {
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, { id: actorId, admin });
      const [operation] = await transaction
        .select()
        .from(economicOperations)
        .where(eq(economicOperations.id, id));
      if (!operation) {
        throw new DomainError(HTTP.notFound, 'OPERATION_NOT_FOUND', 'Операция не найдена');
      }
      await assertOperationReader(transaction, operation, { id: actorId, admin });
      const links = await transaction
        .select()
        .from(economicJournals)
        .where(eq(economicJournals.operationId, id));
      return {
        id,
        initiatorId: operation.initiatorId,
        actorId: operation.actorId,
        companyDecisionId: operation.companyDecisionId,
        createdAt: operation.createdAt.toISOString(),
        calculation: operation.calculation,
        journals: links.map((link) => ({
          id: link.journalId,
          assessmentId: link.assessmentId,
          creditorStateId: link.creditorStateId,
        })),
      };
    });
  }
  public async publicState(
    stateId: string,
    locale: Locale,
  ): Promise<z.infer<typeof PublicTaxationSchema>> {
    return await this.db.transaction(
      async (transaction) => {
        const record = await publicOffice(transaction, stateId);
        const { reviews: privateReviews, ...office } = await taxOfficeDto(transaction, record);
        void privateReviews;
        const revisions = await currentStateLaws(transaction, stateId);
        const latest = new Map<string, z.infer<typeof LawRevisionSchema>>();
        for (const revision of revisions) {
          if (
            !latest.has(revision.lawId) ||
            (latest.get(revision.lawId)?.number ?? 0) < revision.number
          ) {
            latest.set(revision.lawId, revision);
          }
        }
        return {
          office,
          laws: await Promise.all(
            [...latest.values()]
              .filter((revision) => revision.status === 'ACTIVE')
              .map(async (revision) => await publicLaw(revision, locale)),
          ),
        };
      },
      { isolationLevel: 'repeatable read' },
    );
  }
  public async publicLaw(
    lawId: string,
    locale: Locale,
    page = 1,
  ): Promise<{
    revisions: z.infer<typeof PublicLawRevisionSchema>[];
    page: number;
    hasMore: boolean;
  }> {
    return await this.db.transaction(
      async (transaction) => {
        const [law] = await transaction.select().from(taxLaws).where(eq(taxLaws.id, lawId));
        if (!law) {
          throw new DomainError(HTTP.notFound, 'LAW_NOT_FOUND', 'Закон не найден');
        }
        await publicOffice(transaction, law.stateId);
        const revisions = await stateLawRevisions(transaction, law.stateId, {
          publicOnly: true,
          lawId,
          page,
        });
        return {
          page,
          hasMore: revisions.length > HISTORY_LIMIT,
          revisions: await Promise.all(
            revisions
              .slice(0, HISTORY_LIMIT)
              .filter((revision) => revision.lawId === lawId)
              .map(async (revision) => await publicLaw(revision, locale)),
          ),
        };
      },
      { isolationLevel: 'repeatable read' },
    );
  }
}
export { TaxationService };
