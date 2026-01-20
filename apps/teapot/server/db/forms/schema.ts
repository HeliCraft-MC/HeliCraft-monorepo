// Forms database schema
// Source: .dev/dbs/forms.sql

import { relations } from 'drizzle-orm'
import {
  bigint,
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
} from 'drizzle-orm/mysql-core'

// Forms table
export const forms = mysqlTable('forms', {
  id: int('id').autoincrement().primaryKey(),
  uuid: varchar('uuid', { length: 36 }).notNull().unique(),
  ownerUuid: varchar('owner_uuid', { length: 36 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: mysqlEnum('status', ['draft', 'published', 'closed', 'archived']).notNull().default('draft'),
  theme: json('theme'),
  settings: json('settings'),
  publicHash: varchar('public_hash', { length: 64 }).unique(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
})

// Questions table
export const questions = mysqlTable('questions', {
  id: int('id').autoincrement().primaryKey(),
  formId: int('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
  uuid: varchar('uuid', { length: 36 }).notNull().unique(),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  isRequired: boolean('is_required').notNull().default(false),
  options: json('options'),
  validation: json('validation'),
  orderIndex: int('order_index').notNull().default(0),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
}, table => [
  index('questions_form_id_idx').on(table.formId),
])

// Responses table
export const responses = mysqlTable('responses', {
  id: int('id').autoincrement().primaryKey(),
  formId: int('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
  respondentUuid: varchar('respondent_uuid', { length: 36 }).notNull(),
  submittedAt: bigint('submitted_at', { mode: 'number' }).notNull(),
}, table => [
  index('responses_form_id_idx').on(table.formId),
])

// Answers table
export const answers = mysqlTable('answers', {
  id: int('id').autoincrement().primaryKey(),
  responseId: int('response_id').notNull().references(() => responses.id, { onDelete: 'cascade' }),
  questionId: int('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  value: text('value'),
}, table => [
  index('answers_response_id_idx').on(table.responseId),
  index('answers_question_id_idx').on(table.questionId),
])

// Relations
export const formsRelations = relations(forms, ({ many }) => ({
  questions: many(questions),
  responses: many(responses),
}))

export const questionsRelations = relations(questions, ({ one, many }) => ({
  form: one(forms, {
    fields: [questions.formId],
    references: [forms.id],
  }),
  answers: many(answers),
}))

export const responsesRelations = relations(responses, ({ one, many }) => ({
  form: one(forms, {
    fields: [responses.formId],
    references: [forms.id],
  }),
  answers: many(answers),
}))

export const answersRelations = relations(answers, ({ one }) => ({
  response: one(responses, {
    fields: [answers.responseId],
    references: [responses.id],
  }),
  question: one(questions, {
    fields: [answers.questionId],
    references: [questions.id],
  }),
}))

// Type exports
export type Form = typeof forms.$inferSelect
export type NewForm = typeof forms.$inferInsert
export type Question = typeof questions.$inferSelect
export type NewQuestion = typeof questions.$inferInsert
export type Response = typeof responses.$inferSelect
export type NewResponse = typeof responses.$inferInsert
export type Answer = typeof answers.$inferSelect
export type NewAnswer = typeof answers.$inferInsert
