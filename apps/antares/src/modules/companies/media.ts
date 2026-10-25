// oxlint-disable import/max-dependencies -- Private image review delegates to the actual decision and application readers before resolving exact media references.
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import type { S3Client } from '@aws-sdk/client-s3';
import type { Database } from '../../db';
import { companyMedia } from '../../db/schema';
import { MediaObjects } from '../media/objects';
import { DomainError, HTTP } from '../errors';
import { assertCompanyMediaReader } from './media-access';
import { companyRecord } from './store';
import { authorizedCompanyProof } from './decision-detail';
import { CompanyApplicationService } from './application-read';
import type { CompanyRevisionContent } from './contracts';
import { readCompanyRevision } from './revisions';

const MAX_BYTES = 10_000_000;
const MAX_DIMENSION = 4096;
const LOGO_SIZE = 512;
const COVER_WIDTH = 1920;
type CompanyMediaKind = 'LOGO' | 'COVER';
async function processCompanyImage(
  file: File,
  kind: CompanyMediaKind,
): Promise<{ image: Buffer; width: number; height: number }> {
  if (file.size > MAX_BYTES) {
    throw new DomainError(
      HTTP.tooLarge,
      'COMPANY_IMAGE_TOO_LARGE',
      'Максимальный размер изображения — 10 МБ',
    );
  }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new DomainError(HTTP.badRequest, 'COMPANY_IMAGE_FORMAT', 'Нужен PNG, JPEG или WebP');
  }
  try {
    const source = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: MAX_DIMENSION * MAX_DIMENSION,
      animated: false,
    });
    const metadata = await source.metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > MAX_DIMENSION ||
      metadata.height > MAX_DIMENSION ||
      (metadata.pages ?? 1) !== 1 ||
      !['png', 'jpeg', 'webp'].includes(metadata.format ?? '')
    ) {
      throw new Error('Invalid image');
    }
    const resized =
      kind === 'LOGO'
        ? source.rotate().resize(LOGO_SIZE, LOGO_SIZE, { fit: 'cover' })
        : source.rotate().resize({ width: COVER_WIDTH, withoutEnlargement: true });
    const result = await resized.webp().toBuffer({ resolveWithObject: true });
    return { image: result.data, width: result.info.width, height: result.info.height };
  } catch {
    throw new DomainError(
      HTTP.badRequest,
      'COMPANY_IMAGE_INVALID',
      'Не удалось прочитать изображение. Нужен PNG, JPEG или WebP до 4096×4096',
    );
  }
}
class CompanyMediaService {
  private readonly db: Database['db'];
  private readonly objects: MediaObjects;
  public constructor(db: Database['db'], storage: S3Client, bucket: string) {
    this.db = db;
    this.objects = new MediaObjects(storage, bucket);
  }
  public async upload(
    input: Readonly<{ companyId: string; actorId: string; kind: CompanyMediaKind }>,
    file: File,
  ): Promise<{ id: string; width: number; height: number }> {
    const { companyId, actorId, kind } = input;
    await this.db.transaction(async (transaction) => {
      await assertCompanyMediaReader(transaction, companyId, actorId);
    });
    const processed = await processCompanyImage(file, kind);
    const id = crypto.randomUUID();
    const storageKey = `company-media/${companyId}/${id}.webp`;
    await this.objects.write(storageKey, processed.image);
    await this.db.insert(companyMedia).values({
      id,
      companyId,
      ownerId: actorId,
      kind,
      storageKey,
      width: processed.width,
      height: processed.height,
    });
    return { id, width: processed.width, height: processed.height };
  }
  private async readReviewReference(
    companyId: string,
    mediaId: string,
    branding: CompanyRevisionContent['branding'],
  ): Promise<Buffer> {
    if (mediaId !== branding?.logoMediaId && mediaId !== branding?.coverMediaId) {
      throw new DomainError(HTTP.notFound, 'COMPANY_IMAGE_NOT_FOUND', 'Изображение не найдено');
    }
    const [record] = await this.db.select().from(companyMedia).where(eq(companyMedia.id, mediaId));
    if (record?.companyId !== companyId) {
      throw new DomainError(HTTP.notFound, 'COMPANY_IMAGE_NOT_FOUND', 'Изображение не найдено');
    }
    return await this.objects.read(record.storageKey);
  }
  public async decisionImage(
    input: Readonly<{ id: string; mediaId: string; actorId: string }>,
  ): Promise<Buffer> {
    const proof = await this.db.transaction(
      async (transaction) =>
        await authorizedCompanyProof(transaction, input.id, { id: input.actorId, admin: false }),
    );
    let branding: CompanyRevisionContent['branding'] = proof.content.branding;
    if (proof.payload.kind === 'UPDATE_PROFILE') {
      ({ branding } = proof.payload);
    }
    if (proof.payload.kind === 'AMEND_CHARTER') {
      ({ branding } = proof.payload.content);
    }
    return await this.readReviewReference(proof.company.id, input.mediaId, branding);
  }
  public async applicationImage(
    input: Readonly<{ id: string; mediaId: string; actorId: string }>,
  ): Promise<Buffer> {
    const application = await new CompanyApplicationService(this.db).detail(input.id, {
      id: input.actorId,
      admin: false,
    });
    return await this.readReviewReference(
      application.companyId,
      input.mediaId,
      application.configuration.branding,
    );
  }
  public async read(companyId: string, mediaId: string, actorId?: string): Promise<Buffer> {
    const media = await this.db.transaction(async (transaction) => {
      if (actorId === undefined) {
        const company = await companyRecord(transaction, companyId);
        if (
          company.foundedAt === null ||
          company.currentRevisionId === null ||
          !['ACTIVE', 'SUSPENDED', 'CLOSED'].includes(company.status)
        ) {
          throw new DomainError(HTTP.notFound, 'COMPANY_IMAGE_NOT_FOUND', 'Изображение не найдено');
        }
        const { content } = await readCompanyRevision(transaction, company.currentRevisionId);
        if (
          mediaId !== content.branding?.logoMediaId &&
          mediaId !== content.branding?.coverMediaId
        ) {
          throw new DomainError(HTTP.notFound, 'COMPANY_IMAGE_NOT_FOUND', 'Изображение не найдено');
        }
      } else {
        await assertCompanyMediaReader(transaction, companyId, actorId);
      }
      const [record] = await transaction
        .select()
        .from(companyMedia)
        .where(eq(companyMedia.id, mediaId));
      if (record?.companyId !== companyId) {
        throw new DomainError(HTTP.notFound, 'COMPANY_IMAGE_NOT_FOUND', 'Изображение не найдено');
      }
      return record;
    });
    return await this.objects.read(media.storageKey);
  }
}
export { CompanyMediaService, processCompanyImage };
