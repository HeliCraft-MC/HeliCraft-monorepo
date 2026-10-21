import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  foreignKey,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './core-schema';
import { localizedTexts, stateGovernanceRevisions } from './state-schema';
import { legalSubjects, companyRevisions } from './company-identity-schema';
import type { SurveyAnswer } from '../modules/voting/survey-contracts';
import type { VotingInput, VotingSubject } from '../modules/voting/contracts';

const time = (name: string): ReturnType<typeof timestamp> =>
  timestamp(name, { withTimezone: true });
const votings = pgTable(
  'votings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    status: text('status')
      .$type<'DRAFT' | 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'CANCELLED' | 'ARCHIVED'>()
      .notNull()
      .default('DRAFT'),
    titleTextId: uuid('title_text_id')
      .notNull()
      .references(() => localizedTexts.id),
    descriptionTextId: uuid('description_text_id')
      .notNull()
      .references(() => localizedTexts.id),
    opensAt: time('opens_at').notNull(),
    closesAt: time('closes_at').notNull(),
    configuration: jsonb('configuration').$type<VotingInput>().notNull(),
    governanceRevisionId: uuid('governance_revision_id').references(
      () => stateGovernanceRevisions.id,
    ),
    companyRevisionId: uuid('company_revision_id').references(() => companyRevisions.id),
    subject: jsonb('subject').$type<VotingSubject>(),
    snapshotAt: time('snapshot_at'),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (table) => [
    check('voting_window_valid', sql`${table.closesAt} > ${table.opensAt}`),
    index('voting_schedule').on(table.status, table.opensAt),
  ],
);
const votingOptions = pgTable(
  'voting_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    votingId: uuid('voting_id')
      .notNull()
      .references(() => votings.id),
    optionKey: uuid('option_key').notNull(),
    labelTextId: uuid('label_text_id')
      .notNull()
      .references(() => localizedTexts.id),
    position: integer('position').notNull(),
  },
  (table) => [uniqueIndex('voting_option_key').on(table.votingId, table.optionKey)],
);
const votingQuestions = pgTable(
  'voting_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    votingId: uuid('voting_id')
      .notNull()
      .references(() => votings.id),
    questionKey: uuid('question_key').notNull(),
    titleTextId: uuid('title_text_id')
      .notNull()
      .references(() => localizedTexts.id),
  },
  (table) => [uniqueIndex('voting_question_key').on(table.votingId, table.questionKey)],
);
const votingEligibleVoters = pgTable(
  'voting_eligible_voters',
  {
    votingId: uuid('voting_id')
      .notNull()
      .references(() => votings.id),
    voterId: uuid('voter_id').notNull(),
    userId: uuid('user_id').references(() => users.id),
    subjectId: uuid('subject_id').references(() => legalSubjects.id),
    weight: numeric('weight', { precision: 38, scale: 0 }).notNull().default('1'),
  },
  (table) => [
    primaryKey({ columns: [table.votingId, table.voterId] }),
    check('voting_weight_positive', sql`${table.weight} > 0`),
    check(
      'voting_voter_identity',
      sql`(
      ${table.userId} is not null and ${table.subjectId} is null and ${table.voterId} = ${table.userId}
    ) or (
      ${table.userId} is null and ${table.subjectId} is not null and ${table.voterId} = ${table.subjectId}
    )`,
    ),
  ],
);
const votingBallots = pgTable(
  'voting_ballots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    votingId: uuid('voting_id')
      .notNull()
      .references(() => votings.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    voterId: uuid('voter_id').notNull(),
    companyDecisionId: uuid('company_decision_id'),
    stateDirectiveId: uuid('state_directive_id'),
    databaseTransaction: text('database_transaction')
      .notNull()
      .default(sql`pg_current_xact_id()::text`),
    answers: jsonb('answers').$type<SurveyAnswer[]>(),
    repeatKey: uuid('repeat_key'),
    abstain: boolean('abstain').notNull().default(false),
    castAt: time('cast_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('voting_one_ballot')
      .on(table.votingId, table.voterId)
      .where(sql`${table.repeatKey} IS NULL`),
    foreignKey({
      name: 'voting_ballot_frozen_voter',
      columns: [table.votingId, table.voterId],
      foreignColumns: [votingEligibleVoters.votingId, votingEligibleVoters.voterId],
    }),
  ],
);
const votingBallotChoices = pgTable(
  'voting_ballot_choices',
  {
    ballotId: uuid('ballot_id')
      .notNull()
      .references(() => votingBallots.id),
    optionId: uuid('option_id')
      .notNull()
      .references(() => votingOptions.id),
  },
  (table) => [primaryKey({ columns: [table.ballotId, table.optionId] })],
);

const votingSurveyTexts = pgTable(
  'voting_survey_texts',
  {
    votingId: uuid('voting_id')
      .notNull()
      .references(() => votings.id),
    key: text('key').notNull(),
    textId: uuid('text_id')
      .notNull()
      .references(() => localizedTexts.id),
  },
  (table) => [primaryKey({ columns: [table.votingId, table.key] })],
);
export {
  votingSurveyTexts,
  votings,
  votingQuestions,
  votingOptions,
  votingEligibleVoters,
  votingBallots,
  votingBallotChoices,
};
