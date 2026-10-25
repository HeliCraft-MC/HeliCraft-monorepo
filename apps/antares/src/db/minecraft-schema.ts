import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { authSessions, users } from './core-schema';

const minecraftChallenges = pgTable(
  'minecraft_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    username: text('username').notNull(),
    proxyId: text('proxy_id').notNull(),
    connectionId: uuid('connection_id').notNull().unique(),
    verifierHash: text('verifier_hash').notNull(),
    codeHash: text('code_hash').notNull(),
    status: text('status', {
      enum: ['WAITING_AUTH', 'APPROVED', 'CONSUMED', 'REJECTED', 'EXPIRED', 'DISCONNECTED'],
    })
      .notNull()
      .default('WAITING_AUTH'),
    attempts: integer('attempts').notNull().default(0),
    approvedSessionId: uuid('approved_session_id').references(() => authSessions.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    polledAt: timestamp('polled_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('minecraft_challenges_account').on(table.userId, table.createdAt),
    check(
      'minecraft_challenge_status',
      sql`${table.status} in ('WAITING_AUTH','APPROVED','CONSUMED','REJECTED','EXPIRED','DISCONNECTED')`,
    ),
    check('minecraft_challenge_attempts', sql`${table.attempts} between 0 and 5`),
    check('minecraft_challenge_lifetime', sql`${table.expiresAt} > ${table.createdAt}`),
  ],
);
const minecraftSessions = pgTable(
  'minecraft_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    challengeId: uuid('challenge_id')
      .notNull()
      .unique()
      .references(() => minecraftChallenges.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    username: text('username').notNull(),
    proxyId: text('proxy_id').notNull(),
    backendId: text('backend_id').notNull(),
    connectionId: uuid('connection_id').notNull().unique(),
    approvedSessionId: uuid('approved_session_id')
      .notNull()
      .references(() => authSessions.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    proxyExpiresAt: timestamp('proxy_expires_at', { withTimezone: true }).notNull(),
    paperExpiresAt: timestamp('paper_expires_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    endReason: text('end_reason'),
  },
  (table) => [
    uniqueIndex('minecraft_one_session')
      .on(table.userId)
      .where(sql`${table.endedAt} is null`),
    index('minecraft_sessions_account').on(table.userId, table.createdAt),
  ],
);
const minecraftEvents = pgTable(
  'minecraft_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => minecraftSessions.id),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    type: text('type', {
      enum: ['MINECRAFT_SESSION_STARTED', 'MINECRAFT_SESSION_ENDED'],
    }).notNull(),
    source: text('source').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    schemaVersion: integer('schema_version').notNull().default(1),
    visibility: text('visibility').notNull().default('PRIVATE'),
    reason: text('reason'),
  },
  (table) => [
    uniqueIndex('minecraft_event_once').on(table.sessionId, table.type),
    index('minecraft_events_account').on(table.actorId, table.occurredAt),
    check(
      'minecraft_event_type',
      sql`${table.type} in ('MINECRAFT_SESSION_STARTED','MINECRAFT_SESSION_ENDED')`,
    ),
    check(
      'minecraft_event_private',
      sql`${table.visibility} = 'PRIVATE' and ${table.schemaVersion} = 1`,
    ),
  ],
);
export { minecraftChallenges, minecraftSessions, minecraftEvents };
