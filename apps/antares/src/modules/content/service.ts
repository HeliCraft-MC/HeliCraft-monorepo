import { ContentReader } from './reader';
import { replaceFeatured } from './featured';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  contentDocuments,
  contentRedirects,
  contentRevisions,
  adminAuditLog,
} from '../../db/schema';
import type { Principal } from '../identity/contracts';
import { authorizeMutation } from '../permissions/transaction';
import { requirePermission } from '../permissions/policy';
import { HTTP, DomainError, isUniqueConflict } from '../errors';
import { ContentInputSchema } from './contracts';
import type { ContentInput, ContentKind, AdminContent } from './contracts';

function transitionValues(state: boolean | 'ARCHIVED'): {
  status: 'ARCHIVED' | 'PUBLISHED' | 'DRAFT';
  action: string;
} {
  if (state === 'ARCHIVED') {
    return { status: 'ARCHIVED', action: 'content.archived' };
  }
  if (state) {
    return { status: 'PUBLISHED', action: 'content.published' };
  }
  return { status: 'DRAFT', action: 'content.unpublished' };
}
const CONTENT_WRITE_LOCK = 741_021;
class ContentService extends ContentReader {
  private readonly writeDb: Database['db'];
  public constructor(db: Database['db']) {
    super(db);
    this.writeDb = db;
  }

  public async create(
    kind: ContentKind,
    input: ContentInput,
    principal: Principal,
  ): Promise<AdminContent> {
    requirePermission(principal.roles, 'content.write');
    const id = crypto.randomUUID();
    try {
      await this.writeDb.transaction(async (transaction) => {
        await authorizeMutation(transaction, principal.id, 'content.write');
        await transaction.execute(sql`select pg_advisory_xact_lock(${CONTENT_WRITE_LOCK})`);
        const [redirect] = await transaction
          .select()
          .from(contentRedirects)
          .where(and(eq(contentRedirects.kind, kind), eq(contentRedirects.slug, input.slug)));
        if (redirect) {
          throw new DomainError(
            HTTP.conflict,
            'SLUG_TAKEN',
            'Этот адрес сохранён для старой публикации',
          );
        }
        await transaction
          .insert(contentDocuments)
          .values({ ...input, id, kind, createdBy: principal.id, updatedBy: principal.id });
        await transaction
          .insert(contentRevisions)
          .values({ documentId: id, revision: 1, snapshot: input, editorId: principal.id });
        await transaction.insert(adminAuditLog).values({
          actorId: principal.id,
          action: 'content.created',
          targetType: kind,
          targetId: id,
        });
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new DomainError(HTTP.conflict, 'SLUG_TAKEN', 'Этот адрес уже занят');
      }
      throw error;
    }
    return await this.adminDocument(id, principal);
  }
  // oxlint-disable max-lines-per-function -- Slug reservation, revision and audit updates must share one atomic transaction.
  public async save(id: string, input: ContentInput, principal: Principal): Promise<AdminContent> {
    requirePermission(principal.roles, 'content.write');
    try {
      await this.writeDb.transaction(async (transaction) => {
        await authorizeMutation(transaction, principal.id, 'content.write');
        await transaction.execute(sql`select pg_advisory_xact_lock(${CONTENT_WRITE_LOCK})`);
        const [document] = await transaction
          .select()
          .from(contentDocuments)
          .where(eq(contentDocuments.id, id))
          .for('update');
        if (!document) {
          throw new DomainError(HTTP.notFound, 'CONTENT_NOT_FOUND', 'Документ не найден');
        }
        const [redirect] = await transaction
          .select()
          .from(contentRedirects)
          .where(
            and(eq(contentRedirects.kind, document.kind), eq(contentRedirects.slug, input.slug)),
          );
        if (redirect && redirect.documentId !== id) {
          throw new DomainError(HTTP.conflict, 'SLUG_TAKEN', 'Этот адрес уже занят');
        }
        if (document.slug !== input.slug && document.publishedAt !== null) {
          await transaction
            .insert(contentRedirects)
            .values({ kind: document.kind, slug: document.slug, documentId: id })
            .onConflictDoNothing();
        }
        if (document.status === 'PUBLISHED' && document.kind === 'CHRONICLE' && input.isFeatured) {
          await replaceFeatured(transaction, id, principal.id);
        }
        await transaction
          .update(contentDocuments)
          .set({
            ...input,
            revision: document.revision + 1,
            updatedBy: principal.id,
            updatedAt: new Date(),
          })
          .where(eq(contentDocuments.id, id));
        await transaction.insert(contentRevisions).values({
          documentId: id,
          revision: document.revision + 1,
          snapshot: input,
          editorId: principal.id,
        });
        await transaction.insert(adminAuditLog).values({
          actorId: principal.id,
          action: 'content.updated',
          targetType: document.kind,
          targetId: id,
        });
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new DomainError(HTTP.conflict, 'SLUG_TAKEN', 'Адрес или featured-позиция уже заняты');
      }
      throw error;
    }
    return await this.adminDocument(id, principal);
  }
  // oxlint-enable max-lines-per-function
  public async publish(
    id: string,
    published: boolean | 'ARCHIVED',
    principal: Principal,
  ): Promise<AdminContent> {
    requirePermission(principal.roles, 'content.publish');
    await this.writeDb.transaction(async (transaction) => {
      await authorizeMutation(transaction, principal.id, 'content.publish');
      await transaction.execute(sql`select pg_advisory_xact_lock(${CONTENT_WRITE_LOCK})`);
      // Serialize featured transitions so there is at most one public featured chronicle entry.

      const [document] = await transaction
        .select()
        .from(contentDocuments)
        .where(eq(contentDocuments.id, id))
        .for('update');
      if (!document) {
        throw new DomainError(HTTP.notFound, 'CONTENT_NOT_FOUND', 'Документ не найден');
      }
      if (published === true && document.isFeatured && document.kind === 'CHRONICLE') {
        await replaceFeatured(transaction, id, principal.id);
      }
      await transaction
        .update(contentDocuments)
        .set({
          status: transitionValues(published).status,
          publishedAt:
            published === true ? (document.publishedAt ?? new Date()) : document.publishedAt,
          updatedBy: principal.id,
          updatedAt: new Date(),
        })
        .where(eq(contentDocuments.id, id));
      await transaction.insert(adminAuditLog).values({
        actorId: principal.id,
        action: transitionValues(published).action,
        targetType: document.kind,
        targetId: id,
      });
    });
    return await this.adminDocument(id, principal);
  }
  public async revisions(
    id: string,
    principal: Principal,
  ): Promise<(typeof contentRevisions.$inferSelect)[]> {
    requirePermission(principal.roles, 'content.read');
    return await this.writeDb
      .select()
      .from(contentRevisions)
      .where(eq(contentRevisions.documentId, id))
      .orderBy(desc(contentRevisions.revision));
  }
  public async restore(id: string, revision: number, principal: Principal): Promise<AdminContent> {
    requirePermission(principal.roles, 'content.write');
    const [old] = await this.writeDb
      .select()
      .from(contentRevisions)
      .where(and(eq(contentRevisions.documentId, id), eq(contentRevisions.revision, revision)));
    if (!old) {
      throw new DomainError(HTTP.notFound, 'REVISION_NOT_FOUND', 'Редакция не найдена');
    }
    return await this.save(id, ContentInputSchema.parse(old.snapshot), principal);
  }
}

export { ContentService };
