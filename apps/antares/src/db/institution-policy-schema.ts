import { pgTable, uuid, text, primaryKey } from 'drizzle-orm/pg-core';
import { monetaryDirectives } from './monetary-schema';
import { localizedTexts } from './state-schema';

const institutionPolicyTexts = pgTable(
  'institution_policy_texts',
  {
    directiveId: uuid('directive_id')
      .notNull()
      .references(() => monetaryDirectives.id),
    action: text('action').notNull(),
    textId: uuid('text_id')
      .notNull()
      .references(() => localizedTexts.id),
  },
  (table) => [primaryKey({ columns: [table.directiveId, table.action] })],
);
export { institutionPolicyTexts };
