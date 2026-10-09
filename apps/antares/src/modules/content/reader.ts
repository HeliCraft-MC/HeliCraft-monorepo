import { and, count, desc, eq } from 'drizzle-orm';
import type { Database } from '../../db';
import { contentDocuments, contentRedirects, users } from '../../db/schema';
import type { Principal } from '../identity/contracts';
import { requirePermission } from '../permissions/policy';
import { HTTP, DomainError } from '../errors';
import { renderMarkdown } from './markdown';
import type { ContentKind, PublicContent, AdminContent } from './contracts';

type Document = typeof contentDocuments.$inferSelect;
interface DocumentWithAuthor {
  readonly document: Document;
  readonly author: string;
}
async function publicDto(row: DocumentWithAuthor): Promise<PublicContent> {
  const { document } = row;
  return {
    id: document.id,
    kind: document.kind,
    slug: document.slug,
    title: document.title,
    description: document.description,
    html: await renderMarkdown(document.markdown),
    seoTitle: document.seoTitle,
    seoDescription: document.seoDescription,
    category: document.category,
    isFeatured: document.isFeatured,
    publishedAt: document.publishedAt?.toISOString() ?? null,
    updatedAt: document.updatedAt.toISOString(),
    author: row.author,
  };
}
async function adminDto(row: DocumentWithAuthor): Promise<AdminContent> {
  return {
    ...(await publicDto(row)),
    markdown: row.document.markdown,
    status: row.document.status,
    revision: row.document.revision,
    createdBy: row.document.createdBy,
    updatedBy: row.document.updatedBy,
  };
}
class ContentReader {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async publicList(
    kind: ContentKind,
    page: number,
    pageSize: number,
  ): Promise<{ items: PublicContent[]; total: number }> {
    const condition = and(
      eq(contentDocuments.kind, kind),
      eq(contentDocuments.status, 'PUBLISHED'),
    );
    const rows = await this.db
      .select({ document: contentDocuments, author: users.username })
      .from(contentDocuments)
      .innerJoin(users, eq(users.id, contentDocuments.createdBy))
      .where(condition)
      .orderBy(
        desc(contentDocuments.isFeatured),
        desc(contentDocuments.publishedAt),
        desc(contentDocuments.id),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const [total] = await this.db
      .select({ value: count() })
      .from(contentDocuments)
      .where(condition);
    return {
      items: await Promise.all(rows.map(async (row) => await publicDto(row))),
      total: total?.value ?? 0,
    };
  }
  public async publicDocument(
    kind: ContentKind,
    slug: string,
  ): Promise<{ document: PublicContent; redirect: boolean }> {
    const [row] = await this.db
      .select({ document: contentDocuments, author: users.username })
      .from(contentDocuments)
      .innerJoin(users, eq(users.id, contentDocuments.createdBy))
      .where(
        and(
          eq(contentDocuments.kind, kind),
          eq(contentDocuments.slug, slug),
          eq(contentDocuments.status, 'PUBLISHED'),
        ),
      );
    if (row) {
      return { document: await publicDto(row), redirect: false };
    }
    const [redirect] = await this.db
      .select({ document: contentDocuments, author: users.username })
      .from(contentRedirects)
      .innerJoin(contentDocuments, eq(contentDocuments.id, contentRedirects.documentId))
      .innerJoin(users, eq(users.id, contentDocuments.createdBy))
      .where(
        and(
          eq(contentRedirects.kind, kind),
          eq(contentRedirects.slug, slug),
          eq(contentDocuments.status, 'PUBLISHED'),
        ),
      );
    if (!redirect) {
      throw new DomainError(HTTP.notFound, 'CONTENT_NOT_FOUND', 'Публикация не найдена');
    }
    return { document: await publicDto(redirect), redirect: true };
  }
  public async adminDocument(id: string, principal: Principal): Promise<AdminContent> {
    requirePermission(principal.roles, 'content.read');
    const [row] = await this.db
      .select({ document: contentDocuments, author: users.username })
      .from(contentDocuments)
      .innerJoin(users, eq(users.id, contentDocuments.createdBy))
      .where(eq(contentDocuments.id, id));
    if (!row) {
      throw new DomainError(HTTP.notFound, 'CONTENT_NOT_FOUND', 'Документ не найден');
    }
    return await adminDto(row);
  }
  public async adminList(
    kind: ContentKind,
    query: Readonly<{ page: number; pageSize: number }>,
    principal: Principal,
  ): Promise<{ items: AdminContent[]; total: number }> {
    requirePermission(principal.roles, 'content.read');
    const { page, pageSize } = query;
    const rows = await this.db
      .select({ document: contentDocuments, author: users.username })
      .from(contentDocuments)
      .innerJoin(users, eq(users.id, contentDocuments.createdBy))
      .where(eq(contentDocuments.kind, kind))
      .orderBy(desc(contentDocuments.updatedAt), desc(contentDocuments.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const [total] = await this.db
      .select({ value: count() })
      .from(contentDocuments)
      .where(eq(contentDocuments.kind, kind));
    return {
      items: await Promise.all(rows.map(async (row) => await adminDto(row))),
      total: total?.value ?? 0,
    };
  }
}
export { ContentReader };
