import { and, eq, ne, sql } from 'drizzle-orm';
import { contentDocuments, contentRevisions, adminAuditLog } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { ContentInputSchema } from './contracts';

// oxlint-disable-next-line max-lines-per-function -- One transactional transition records each displaced featured document and its immutable revision.
async function replaceFeatured(
  transaction: Transaction,
  id: string,
  actorId: string,
): Promise<void> {
  const changed = await transaction
    .update(contentDocuments)
    .set({
      isFeatured: false,
      revision: sql`${contentDocuments.revision} + 1`,
      updatedBy: actorId,
      updatedAt: new Date(),
    })
    .where(
      and(
        ne(contentDocuments.id, id),
        eq(contentDocuments.kind, 'CHRONICLE'),
        eq(contentDocuments.isFeatured, true),
        eq(contentDocuments.status, 'PUBLISHED'),
      ),
    )
    .returning();
  if (changed.length === 0) {
    return;
  }
  await transaction.insert(contentRevisions).values(
    changed.map((document) => ({
      documentId: document.id,
      revision: document.revision,
      snapshot: {
        slug: document.slug,
        title: document.title,
        description: document.description,
        markdown: document.markdown,
        seoTitle: document.seoTitle,
        seoDescription: document.seoDescription,
        category: ContentInputSchema.shape.category.parse(document.category),
        isFeatured: false,
      },
      editorId: actorId,
    })),
  );
  await transaction.insert(adminAuditLog).values(
    changed.map((document) => ({
      actorId,
      action: 'content.featured.replaced',
      targetType: 'CHRONICLE',
      targetId: document.id,
    })),
  );
}
export { replaceFeatured };
