import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { Database } from '../../db';
import { galleryImages, users } from '../../db/schema';
import { GalleryMetadataSchema } from './contracts';
import type { GalleryItem, GalleryMetadata } from './contracts';
import { processGalleryImage } from './process';
import type { GalleryObjects } from './objects';
import { DomainError, HTTP } from '../errors';

import { searchPlayers } from '../players/service';

type GalleryRecord = typeof galleryImages.$inferSelect;
class GalleryService {
  private readonly db: Database['db'];
  private readonly objects: GalleryObjects;
  public constructor(db: Database['db'], objects: GalleryObjects) {
    this.db = db;
    this.objects = objects;
  }
  public async searchPlayers(query: string): Promise<{ id: string; name: string }[]> {
    return await searchPlayers(this.db, query);
  }
  private async describe(record: GalleryRecord): Promise<GalleryItem> {
    const people = await this.db
      .select({ id: users.id, name: users.username })
      .from(users)
      .where(inArray(users.id, [record.ownerId, ...record.playerIds]));
    const author = people.find((person) => person.id === record.ownerId);
    if (!author) {
      throw new Error('Gallery author missing');
    }
    return {
      originalLanguage: record.originalLanguage,
      translations: record.translations,
      id: record.id,
      title: record.title,
      description: record.description,
      alt: record.alt,
      place: record.place,
      location: record.location,
      author,
      players: people.filter((person) => record.playerIds.includes(person.id)),
      width: record.width,
      height: record.height,
      createdAt: record.createdAt.toISOString(),
      imageUrl: `/api/v1/public/gallery/${record.id}/image`,
      thumbnailUrl: `/api/v1/public/gallery/${record.id}/thumbnail`,
    };
  }
  public async list(
    page: number,
    pageSize: number,
  ): Promise<{ items: GalleryItem[]; total: number }> {
    return await this.db.transaction(
      async (transaction) => {
        const [total] = await transaction
          .select({ value: count() })
          .from(galleryImages)
          .where(isNull(galleryImages.deletedAt));
        const records = await transaction
          .select()
          .from(galleryImages)
          .where(isNull(galleryImages.deletedAt))
          .orderBy(desc(galleryImages.createdAt), desc(galleryImages.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize);
        return {
          items: await Promise.all(records.map(async (record) => await this.describe(record))),
          total: total?.value ?? 0,
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  private async record(id: string): Promise<GalleryRecord> {
    const [record] = await this.db
      .select()
      .from(galleryImages)
      .where(and(eq(galleryImages.id, id), isNull(galleryImages.deletedAt)));
    if (!record) {
      throw new DomainError(HTTP.notFound, 'GALLERY_NOT_FOUND', 'Снимок не найден');
    }
    return record;
  }
  public async detail(id: string): Promise<GalleryItem> {
    return await this.describe(await this.record(id));
  }
  public async image(id: string, thumbnail: boolean): Promise<Buffer> {
    const record = await this.record(id);
    return await this.objects.read(thumbnail ? record.thumbnailKey : record.storageKey);
  }
  public async upload(ownerId: string, file: Buffer, input: GalleryMetadata): Promise<GalleryItem> {
    const metadata = GalleryMetadataSchema.parse(input);
    const processed = await processGalleryImage(file);
    const id = crypto.randomUUID();
    const storageKey = `gallery/${ownerId}/${id}/image.webp`;
    const thumbnailKey = `gallery/${ownerId}/${id}/thumbnail.webp`;
    await this.objects.write(storageKey, processed.image);
    await this.objects.write(thumbnailKey, processed.thumbnail);
    const record = await this.db.transaction(async (transaction) => {
      const [owner] = await transaction
        .select()
        .from(users)
        .where(eq(users.id, ownerId))
        .for('update');
      if (owner?.status !== 'ACTIVE') {
        throw new DomainError(HTTP.forbidden, 'ACCOUNT_UNAVAILABLE', 'Аккаунт недоступен');
      }
      if (metadata.players.length > 0) {
        const players = await transaction
          .select({ id: users.id })
          .from(users)
          .where(inArray(users.id, metadata.players));
        if (players.length !== new Set(metadata.players).size) {
          throw new DomainError(HTTP.badRequest, 'UNKNOWN_PLAYER', 'Игрок на снимке не найден');
        }
      }
      const [created] = await transaction
        .insert(galleryImages)
        .values({
          ...metadata,
          playerIds: metadata.players,
          ownerId,
          id,
          storageKey,
          thumbnailKey,
          width: processed.width,
          height: processed.height,
        })
        .returning();
      if (!created) {
        throw new Error('Gallery insert returned no row');
      }
      return created;
    });
    return await this.describe(record);
  }
  public async update(id: string, ownerId: string, input: GalleryMetadata): Promise<GalleryItem> {
    const metadata = GalleryMetadataSchema.parse(input);
    const changed = await this.db.transaction(async (transaction) => {
      const [owner] = await transaction
        .select()
        .from(users)
        .where(eq(users.id, ownerId))
        .for('update');
      if (owner?.status !== 'ACTIVE') {
        throw new DomainError(HTTP.forbidden, 'ACCOUNT_UNAVAILABLE', 'Аккаунт недоступен');
      }
      if (metadata.players.length > 0) {
        const players = await transaction
          .select({ id: users.id })
          .from(users)
          .where(inArray(users.id, metadata.players));
        if (players.length !== new Set(metadata.players).size) {
          throw new DomainError(HTTP.badRequest, 'UNKNOWN_PLAYER', 'Игрок на снимке не найден');
        }
      }
      const [record] = await transaction
        .update(galleryImages)
        .set({ ...metadata, playerIds: metadata.players })
        .where(
          and(
            eq(galleryImages.id, id),
            eq(galleryImages.ownerId, ownerId),
            isNull(galleryImages.deletedAt),
          ),
        )
        .returning();
      if (!record) {
        throw new DomainError(
          HTTP.notFound,
          'GALLERY_NOT_FOUND',
          'Снимок не найден или принадлежит другому игроку',
        );
      }
      return record;
    });
    return await this.describe(changed);
  }
  public async remove(id: string, ownerId: string): Promise<void> {
    const changed = await this.db
      .update(galleryImages)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(galleryImages.id, id),
          eq(galleryImages.ownerId, ownerId),
          isNull(galleryImages.deletedAt),
        ),
      )
      .returning({ id: galleryImages.id });
    if (changed.length === 0) {
      throw new DomainError(
        HTTP.notFound,
        'GALLERY_NOT_FOUND',
        'Снимок не найден или принадлежит другому игроку',
      );
    }
    // Private objects remain for lifecycle cleanup; every HTTP read checks the live record.
  }
}
export { GalleryService };
