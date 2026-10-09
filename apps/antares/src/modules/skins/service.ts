import { defaultSkin } from './default';
import { createHash } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { S3Client } from '@aws-sdk/client-s3';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../../db';
import { playerSkins, users } from '../../db/schema';
import { processSkin } from './process';
import type { ProcessedSkin } from './process';
import { DomainError, HTTP } from '../errors';

type SkinRecord = typeof playerSkins.$inferSelect;
class SkinService {
  private readonly db: Database['db'];
  private readonly storage: S3Client;
  private readonly bucket: string;
  public constructor(db: Database['db'], storage: S3Client, bucket: string) {
    this.db = db;
    this.storage = storage;
    this.bucket = bucket;
  }
  public async current(userId: string): Promise<SkinRecord | null> {
    const [record] = await this.db
      .select({ skin: playerSkins })
      .from(users)
      .innerJoin(
        playerSkins,
        and(eq(users.currentSkinId, playerSkins.id), eq(users.id, playerSkins.userId)),
      )
      .where(eq(users.id, userId));
    return record?.skin ?? null;
  }
  public async upload(
    userId: string,
    file: Buffer,
    model: 'CLASSIC' | 'SLIM',
  ): Promise<SkinRecord> {
    const processed = await processSkin(file);
    if (processed.legacy && model === 'SLIM') {
      throw new DomainError(
        HTTP.badRequest,
        'LEGACY_CLASSIC_ONLY',
        'Скин 64×32 использует модель Classic',
      );
    }
    const id = crypto.randomUUID();
    const storageKey = `skins/${userId}/${id}/skin.png`;
    const avatarKey = `skins/${userId}/${id}/avatar.png`;
    await this.writeObjects({ storageKey, avatarKey }, processed);
    return await this.db.transaction(async (transaction) => {
      const [user] = await transaction
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for('update');
      if (user?.status !== 'ACTIVE') {
        throw new DomainError(HTTP.forbidden, 'ACCOUNT_UNAVAILABLE', 'Аккаунт недоступен');
      }
      const [skin] = await transaction
        .insert(playerSkins)
        .values({
          id,
          userId,
          storageKey,
          avatarKey,
          sha256: createHash('sha256').update(processed.png).digest('hex'),
          width: 64,
          height: 64,
          model,
        })
        .returning();
      if (!skin) {
        throw new Error('Skin insert returned no row');
      }
      await transaction
        .update(users)
        .set({ currentSkinId: id, updatedAt: new Date() })
        .where(eq(users.id, userId));
      return skin;
    });
  }
  public async reset(userId: string): Promise<void> {
    const changed = await this.db
      .update(users)
      .set({ currentSkinId: null, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.status, 'ACTIVE')))
      .returning({ id: users.id });
    if (changed.length === 0) {
      throw new DomainError(HTTP.forbidden, 'ACCOUNT_UNAVAILABLE', 'Аккаунт недоступен');
    }
  }
  public async image(userId: string, avatar: boolean): Promise<Buffer | null> {
    const skin = await this.current(userId);
    if (skin !== null) {
      try {
        return await this.readKey(avatar ? skin.avatarKey : skin.storageKey);
      } catch {
        throw new DomainError(
          HTTP.unavailable,
          'STORAGE_UNAVAILABLE',
          'Изображение временно недоступно',
        );
      }
    }
    const [user] = await this.db.select({ id: users.id }).from(users).where(eq(users.id, userId));
    if (user === undefined) {
      return null;
    }
    const standard = await defaultSkin();
    return avatar ? standard.avatar : standard.png;
  }
  private async writeObjects(
    keys: Readonly<{ storageKey: string; avatarKey: string }>,
    processed: ProcessedSkin,
  ): Promise<void> {
    try {
      await this.storage.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: keys.storageKey,
          Body: processed.png,
          ContentType: 'image/png',
        }),
      );
      await this.storage.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: keys.avatarKey,
          Body: processed.avatar,
          ContentType: 'image/png',
        }),
      );
      // Verify readable objects before committing the active pointer. Failed writes remain harmless orphans.
      await this.readKey(keys.storageKey);
      await this.readKey(keys.avatarKey);
    } catch {
      throw new DomainError(
        HTTP.unavailable,
        'STORAGE_UNAVAILABLE',
        'Хранилище недоступно. Текущий скин сохранён',
      );
    }
  }
  private async readKey(key: string): Promise<Buffer> {
    const response = await this.storage.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!response.Body) {
      throw new Error('Missing S3 object');
    }
    return Buffer.from(await response.Body.transformToByteArray());
  }
}

export { SkinService, type SkinRecord };
