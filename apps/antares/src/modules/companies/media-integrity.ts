import { eq } from 'drizzle-orm';
import { companyMedia } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import type { CompanyRevisionContent } from './contracts';

async function assertCompanyBrandingMedia(
  transaction: Transaction,
  companyId: string,
  branding: CompanyRevisionContent['branding'],
): Promise<void> {
  if (branding === undefined) {
    return;
  }
  for (const [kind, mediaId] of [
    ['LOGO', branding.logoMediaId],
    ['COVER', branding.coverMediaId],
  ] as const) {
    if (mediaId !== null) {
      // oxlint-disable-next-line no-await-in-loop -- Each immutable asset is checked against its company and declared purpose before publication.
      const [media] = await transaction
        .select()
        .from(companyMedia)
        .where(eq(companyMedia.id, mediaId));
      if (media?.companyId !== companyId || media.kind !== kind) {
        throw new DomainError(
          HTTP.conflict,
          'COMPANY_MEDIA_UNAVAILABLE',
          'Изображение недоступно или принадлежит другой компании',
        );
      }
    }
  }
}
export { assertCompanyBrandingMedia };
