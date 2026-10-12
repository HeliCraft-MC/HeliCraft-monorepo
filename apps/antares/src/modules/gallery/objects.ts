import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { S3Client } from '@aws-sdk/client-s3';
import { DomainError, HTTP } from '../errors';

class GalleryObjects {
  private readonly storage: S3Client;
  private readonly bucket: string;
  public constructor(storage: S3Client, bucket: string) {
    this.storage = storage;
    this.bucket = bucket;
  }
  public async read(key: string): Promise<Buffer> {
    try {
      const object = await this.storage.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!object.Body) {
        throw new Error('Missing object');
      }
      return Buffer.from(await object.Body.transformToByteArray());
    } catch {
      throw new DomainError(
        HTTP.unavailable,
        'STORAGE_UNAVAILABLE',
        'Изображение временно недоступно',
      );
    }
  }
  public async write(key: string, body: Buffer): Promise<void> {
    try {
      await this.storage.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: 'image/webp',
        }),
      );
      await this.read(key);
    } catch {
      throw new DomainError(
        HTTP.unavailable,
        'STORAGE_UNAVAILABLE',
        'Хранилище недоступно. Попробуйте позже',
      );
    }
  }
}
export { GalleryObjects };
