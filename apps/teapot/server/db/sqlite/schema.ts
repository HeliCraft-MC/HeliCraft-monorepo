// SQLite database schema
// Tables: skins, gallery, file_refs
// Source: server/plugins/skinSqlite.ts

import {
    index,
    integer,
    sqliteTable,
    text,
} from 'drizzle-orm/sqlite-core';

// Skins table
export const skins = sqliteTable('skins', {
    uuid: text('uuid').primaryKey(),
    path: text('path').notNull(),
    mime: text('mime').notNull(),
    size: integer('size'),
    created: integer('created'),
});

// Gallery table
export const gallery = sqliteTable('gallery', {
    id: text('id').primaryKey(),
    path: text('path').notNull(),
    mime: text('mime').notNull(),
    size: integer('size').notNull(),
    ownerUuid: text('owner_uuid').notNull(),
    description: text('description'),
    category: text('category'),
    season: text('season'),
    coordX: integer('coord_x'),
    coordY: integer('coord_y'),
    coordZ: integer('coord_z'),
    involvedPlayers: text('involved_players'), // JSON array as text
    status: text('status').notNull().default('pending'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
}, table => [
    index('idx_gallery_status').on(table.status),
    index('idx_gallery_owner').on(table.ownerUuid),
    index('idx_gallery_category').on(table.category),
    index('idx_gallery_season').on(table.season),
]);

// File refs table (CAS - Content Addressable Storage)
export const fileRefs = sqliteTable('file_refs', {
    hash: text('hash').primaryKey(),
    path: text('path').notNull(),
    mime: text('mime').notNull(),
    size: integer('size').notNull(),
    refCount: integer('ref_count').notNull().default(1),
    createdAt: integer('created_at').notNull(),
    lastUsedAt: integer('last_used_at').notNull(),
}, table => [
    index('idx_file_refs_path').on(table.path),
    index('idx_file_refs_refcount').on(table.refCount),
]);

// Type exports
export type Skin = typeof skins.$inferSelect;
export type NewSkin = typeof skins.$inferInsert;
export type GalleryImage = typeof gallery.$inferSelect;
export type NewGalleryImage = typeof gallery.$inferInsert;
export type FileRef = typeof fileRefs.$inferSelect;
export type NewFileRef = typeof fileRefs.$inferInsert;
