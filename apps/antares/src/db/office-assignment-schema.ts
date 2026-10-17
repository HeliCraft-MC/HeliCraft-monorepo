import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  primaryKey,
  boolean,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './core-schema';
import { states, stateOffices, stateGovernanceRevisions } from './state-schema';
import { votings } from './voting-schema';

const stateOfficeAssignments = pgTable(
  'state_office_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stateId: uuid('state_id')
      .notNull()
      .references(() => states.id),
    governanceRevisionId: uuid('governance_revision_id')
      .notNull()
      .references(() => stateGovernanceRevisions.id),
    officeId: uuid('office_id')
      .notNull()
      .references(() => stateOffices.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    replacedUserId: uuid('replaced_user_id').references(() => users.id),
    kind: text('kind').$type<'APPOINT' | 'REMOVE'>().notNull(),
    wasVacant: boolean('was_vacant').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    status: text('status')
      .$type<'PENDING' | 'APPLIED' | 'CANCELLED'>()
      .notNull()
      .default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
  },
  (table) => [
    index('office_assignment_state').on(table.stateId, table.createdAt),
    check('office_assignment_kind', sql`${table.kind} in ('APPOINT', 'REMOVE')`),
    check('office_assignment_status', sql`${table.status} in ('PENDING', 'APPLIED', 'CANCELLED')`),
    check(
      'office_assignment_replacement',
      sql`${table.replacedUserId} is null or (${table.kind} = 'APPOINT' and ${table.replacedUserId} <> ${table.userId})`,
    ),
  ],
);
const stateOfficeAssignmentApprovals = pgTable(
  'state_office_assignment_approvals',
  {
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => stateOfficeAssignments.id),
    officeId: uuid('office_id')
      .notNull()
      .references(() => stateOffices.id),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.assignmentId, table.officeId, table.actorId] })],
);
const stateOfficeAssignmentVotes = pgTable(
  'state_office_assignment_votes',
  {
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => stateOfficeAssignments.id),
    source: text('source').$type<'OFFICE' | 'POLICY' | 'REMOVAL_POLICY'>().notNull(),
    votingId: uuid('voting_id')
      .notNull()
      .unique()
      .references(() => votings.id),
    approvalOptionId: uuid('approval_option_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.assignmentId, table.source] }),
    check(
      'office_assignment_vote_source',
      sql`${table.source} in ('OFFICE', 'POLICY', 'REMOVAL_POLICY')`,
    ),
  ],
);
export { stateOfficeAssignments, stateOfficeAssignmentApprovals, stateOfficeAssignmentVotes };
