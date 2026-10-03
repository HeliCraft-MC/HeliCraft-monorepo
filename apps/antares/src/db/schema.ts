import { geometry, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const worldEvents = pgTable('world_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  description: text('description').notNull(),
  position: geometry('position', { type: 'point', mode: 'xy', srid: 4326 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
