// oxlint-disable no-magic-numbers -- PNG signature bytes and decoded-image dimensions are format constraints.
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import type { Database } from '../../db';
import { stateMedia } from '../../db/schema';
import { MediaObjects } from '../media/objects';
import type { S3Client } from '@aws-sdk/client-s3';
import { DomainError, HTTP } from '../errors';

const MAX_FLAG_BYTES = 2_000_000;
const MAX_FLAG_DIMENSION = 4096;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
async function processFlag(
  bytes: Buffer,
  mime: string,
): Promise<{ image: Buffer; width: number; height: number }> {
  if (mime !== 'image/png' || !bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new DomainError(HTTP.badRequest, 'PNG_REQUIRED', 'Загрузите настоящий PNG');
  }
  if (bytes.length > MAX_FLAG_BYTES) {
    throw new DomainError(HTTP.tooLarge, 'FLAG_TOO_LARGE', 'Максимальный размер флага — 2 МБ');
  }
  try {
    const image = sharp(bytes, { limitInputPixels: MAX_FLAG_DIMENSION ** 2, animated: false });
    const metadata = await image.metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width < metadata.height ||
      metadata.width > MAX_FLAG_DIMENSION ||
      metadata.height > MAX_FLAG_DIMENSION ||
      (metadata.pages ?? 1) > 1
    ) {
      throw new Error('Invalid dimensions');
    }
    return { image: await image.png().toBuffer(), width: metadata.width, height: metadata.height };
  } catch {
    throw new DomainError(
      HTTP.badRequest,
      'INVALID_FLAG',
      'Нужен горизонтальный PNG до 4096×4096 пикселей',
    );
  }
}
class StateMediaService {
  private readonly db: Database['db'];
  private readonly objects: MediaObjects;
  public constructor(db: Database['db'], storage: S3Client, bucket: string) {
    this.db = db;
    this.objects = new MediaObjects(storage, bucket);
  }
  public async upload(
    ownerId: string,
    file: File,
  ): Promise<{ id: string; width: number; height: number }> {
    const processed = await processFlag(Buffer.from(await file.arrayBuffer()), file.type);
    const id = crypto.randomUUID();
    const storageKey = `state-flags/${ownerId}/${id}.png`;
    await this.objects.write(storageKey, processed.image, 'image/png');
    await this.db
      .insert(stateMedia)
      .values({ id, ownerId, storageKey, width: processed.width, height: processed.height });
    return { id, width: processed.width, height: processed.height };
  }
  public async read(id: string, ownerId?: string): Promise<Buffer> {
    const [record] = await this.db.select().from(stateMedia).where(eq(stateMedia.id, id));
    if (!record || (ownerId !== undefined && record.ownerId !== ownerId)) {
      throw new DomainError(HTTP.notFound, 'FLAG_NOT_FOUND', 'Флаг не найден');
    }
    return await this.objects.read(record.storageKey);
  }
}
export { StateMediaService, processFlag };
