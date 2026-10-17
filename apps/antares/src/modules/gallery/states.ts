import { and, eq, inArray } from 'drizzle-orm';
import {
  galleryStateLinks,
  states,
  stateRevisionTexts,
  localizedTextValues,
  stateGovernanceRevisions,
} from '../../db/schema';
import type { Database } from '../../db';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { LocalizedInputSchema } from '../localized-content/contracts';
import type { GalleryMetadata, GalleryItem } from './contracts';

async function saveGalleryStates(
  transaction: Transaction,
  imageId: string,
  links: GalleryMetadata['stateLinks'],
): Promise<void> {
  const ids = [...new Set(links.map((link) => link.stateId))];
  if (ids.length > 0) {
    const records = await transaction
      .select({ id: states.id })
      .from(states)
      .where(and(inArray(states.id, ids), eq(states.status, 'ACTIVE')))
      .for('share');
    if (
      records.length !== ids.length ||
      new Set(links.map((link) => `${link.stateId}:${link.role}`)).size !== links.length
    ) {
      throw new DomainError(
        HTTP.badRequest,
        'INVALID_GALLERY_STATES',
        'Укажите существующие активные государства без повторов',
      );
    }
  }
  await transaction.delete(galleryStateLinks).where(eq(galleryStateLinks.imageId, imageId));
  if (links.length > 0) {
    await transaction.insert(galleryStateLinks).values(links.map((link) => ({ imageId, ...link })));
  }
}
async function readGalleryStates(
  db: Database['db'],
  imageId: string,
): Promise<GalleryItem['states']> {
  const records = await db
    .select({
      id: states.id,
      slug: states.slug,
      configuration: stateGovernanceRevisions.configuration,
      role: galleryStateLinks.role,
      revisionId: states.currentRevisionId,
    })
    .from(galleryStateLinks)
    .innerJoin(states, eq(states.id, galleryStateLinks.stateId))
    .innerJoin(stateGovernanceRevisions, eq(stateGovernanceRevisions.id, states.currentRevisionId))
    .where(and(eq(galleryStateLinks.imageId, imageId), eq(states.status, 'ACTIVE')));
  const ids = records.flatMap((record) => (record.revisionId === null ? [] : [record.revisionId]));
  const translations =
    ids.length === 0
      ? []
      : await db
          .select({
            revisionId: stateRevisionTexts.revisionId,
            locale: localizedTextValues.locale,
            value: localizedTextValues.value,
          })
          .from(stateRevisionTexts)
          .innerJoin(localizedTextValues, eq(localizedTextValues.textId, stateRevisionTexts.textId))
          .where(
            and(inArray(stateRevisionTexts.revisionId, ids), eq(stateRevisionTexts.path, 'name')),
          );
  return records.map((record) => ({
    id: record.id,
    slug: record.slug,
    color: record.configuration.color,
    role: record.role,
    name: LocalizedInputSchema.parse(
      Object.fromEntries(
        translations
          .filter((item) => item.revisionId === record.revisionId)
          .map((item) => [item.locale, item.value]),
      ),
    ),
  }));
}
export { saveGalleryStates, readGalleryStates };
