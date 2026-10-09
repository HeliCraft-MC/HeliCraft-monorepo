import { sql } from 'drizzle-orm';
import {
  check,
  geometry,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  boolean,
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn, PgTimestampBuilderInitial } from 'drizzle-orm/pg-core';

const userStatus = pgEnum('user_status', ['ACTIVE', 'SUSPENDED', 'BANNED']);
const roleName = pgEnum('role_name', ['PLAYER', 'EDITOR', 'MODERATOR', 'ADMIN', 'OWNER']);
const skinModel = pgEnum('skin_model', ['CLASSIC', 'SLIM']);
const contentStatus = pgEnum('content_status', ['DRAFT', 'PUBLISHED', 'ARCHIVED']);
const contentKind = pgEnum('content_kind', ['PAGE', 'CHRONICLE']);
const time = (name: string): PgTimestampBuilderInitial<string> =>
  timestamp(name, { withTimezone: true });

const worldEvents = pgTable('world_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  description: text('description').notNull(),
  position: geometry('position', { type: 'point', mode: 'xy', srid: 4326 }),
  createdAt: time('created_at').defaultNow().notNull(),
});

const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: text('username').notNull(),
    usernameNormalized: text('username_normalized').notNull().unique(),
    status: userStatus('status').notNull().default('ACTIVE'),
    // oxlint-disable-next-line no-use-before-define -- Drizzle resolves circular foreign keys lazily.
    currentSkinId: uuid('current_skin_id').references((): AnyPgColumn => playerSkins.id),
    createdAt: time('created_at').notNull().defaultNow(),
    updatedAt: time('updated_at').notNull().defaultNow(),
    lastLoginAt: time('last_login_at'),
    passwordChangedAt: time('password_changed_at'),
  },
  (table) => [
    check('users_username_format', sql`${table.username} ~ '^[A-Za-z0-9_]{3,16}$'`),
    check('users_username_normalized', sql`${table.usernameNormalized} = lower(${table.username})`),
  ],
);

const userCredentials = pgTable('user_credentials', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'restrict' }),
  passwordHash: text('password_hash').notNull(),
  createdAt: time('created_at').notNull().defaultNow(),
  updatedAt: time('updated_at').notNull().defaultNow(),
});

const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: time('created_at').notNull().defaultNow(),
    lastSeenAt: time('last_seen_at').notNull().defaultNow(),
    expiresAt: time('expires_at').notNull(),
    absoluteExpiresAt: time('absolute_expires_at').notNull(),
    revokedAt: time('revoked_at'),
    userAgent: text('user_agent'),
  },
  (table) => [
    index('sessions_user').on(table.userId),
    index('sessions_expiry').on(table.expiresAt),
  ],
);

const usernameHistory = pgTable(
  'username_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    oldUsername: text('old_username').notNull(),
    newUsername: text('new_username').notNull(),
    changedAt: time('changed_at').notNull().defaultNow(),
  },
  (table) => [index('username_history_user').on(table.userId)],
);

const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    role: roleName('role').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.role] })],
);

const playerSkins = pgTable(
  'player_skins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    storageKey: text('storage_key').notNull().unique(),
    avatarKey: text('avatar_key').notNull().unique(),
    sha256: text('sha256').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    model: skinModel('model').notNull(),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (table) => [index('skins_user').on(table.userId)],
);

// Editorial pages and chronicle share revision mechanics, but never represent domain events.
const contentDocuments = pgTable(
  'content_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: contentKind('kind').notNull(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    markdown: text('markdown').notNull(),
    status: contentStatus('status').notNull().default('DRAFT'),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    category: text('category').notNull().default('Обновления проекта'),
    isFeatured: boolean('is_featured').notNull().default(false),
    revision: integer('revision').notNull().default(1),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    updatedBy: uuid('updated_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: time('created_at').notNull().defaultNow(),
    updatedAt: time('updated_at').notNull().defaultNow(),
    publishedAt: time('published_at'),
  },
  (table) => [
    uniqueIndex('content_kind_slug').on(table.kind, table.slug),
    index('content_publication').on(table.kind, table.status, table.publishedAt),
    uniqueIndex('chronicle_featured')
      .on(table.kind)
      .where(
        sql`${table.isFeatured} = true AND ${table.kind} = 'CHRONICLE' AND ${table.status} = 'PUBLISHED'`,
      ),
  ],
);

const contentRevisions = pgTable(
  'content_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => contentDocuments.id, { onDelete: 'restrict' }),
    revision: integer('revision').notNull(),
    snapshot: jsonb('snapshot')
      .$type<{
        title: string;
        slug: string;
        description: string;
        markdown: string;
        seoTitle: string | null;
        seoDescription: string | null;
        category: string;
        isFeatured: boolean;
      }>()
      .notNull(),
    editorId: uuid('editor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('content_revision_number').on(table.documentId, table.revision)],
);

const contentRedirects = pgTable(
  'content_redirects',
  {
    kind: contentKind('kind').notNull(),
    slug: text('slug').notNull(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => contentDocuments.id, { onDelete: 'restrict' }),
  },
  (table) => [primaryKey({ columns: [table.kind, table.slug] })],
);

const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    occurredAt: time('occurred_at').notNull().defaultNow(),
    metadata: jsonb('metadata')
      .$type<Record<string, string | number | boolean | string[]>>()
      .notNull()
      .default({}),
  },
  (table) => [index('audit_time').on(table.occurredAt), index('audit_target').on(table.targetId)],
);

export {
  userStatus,
  roleName,
  skinModel,
  contentStatus,
  contentKind,
  worldEvents,
  users,
  userCredentials,
  authSessions,
  usernameHistory,
  userRoles,
  playerSkins,
  contentDocuments,
  contentRevisions,
  contentRedirects,
  adminAuditLog,
};
