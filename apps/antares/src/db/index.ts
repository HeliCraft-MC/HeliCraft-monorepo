import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  galleryImages,
  galleryStateLinks,
  worldEvents,
  users,
  userCredentials,
  authSessions,
  userRoles,
  playerSkins,
  usernameHistory,
  contentDocuments,
  contentRevisions,
  contentRedirects,
  adminAuditLog,
  localizedTexts,
  localizedTextValues,
  states,
  stateDrafts,
  stateFounders,
  stateMemberships,
  stateGovernanceRevisions,
  stateRevisionTexts,
  stateOffices,
  stateOfficeRevisionData,
  stateOfficeHolders,
  stateConstitutionRevisions,
  stateConstitutionBlocks,
  stateMedia,
  stateReformApprovals,
  stateReformVotes,
  stateReformProposals,
  stateReformProposalTexts,
  votings,
  stateOfficeAssignments,
  stateOfficeAssignmentApprovals,
  stateOfficeAssignmentVotes,
  votingOptions,
  votingQuestions,
  votingSurveyTexts,
  votingEligibleVoters,
  votingBallots,
  votingBallotChoices,
} from './schema';

const schema = {
  galleryImages,
  galleryStateLinks,
  worldEvents,
  users,
  userCredentials,
  authSessions,
  userRoles,
  playerSkins,
  usernameHistory,
  contentDocuments,
  contentRevisions,
  contentRedirects,
  adminAuditLog,
  localizedTexts,
  localizedTextValues,
  states,
  stateDrafts,
  stateFounders,
  stateMemberships,
  stateGovernanceRevisions,
  stateRevisionTexts,
  stateOffices,
  stateOfficeRevisionData,
  stateOfficeHolders,
  stateConstitutionRevisions,
  stateConstitutionBlocks,
  stateMedia,
  stateReformApprovals,
  stateReformVotes,
  stateReformProposals,
  stateReformProposalTexts,
  votings,
  stateOfficeAssignments,
  stateOfficeAssignmentApprovals,
  stateOfficeAssignmentVotes,
  votingOptions,
  votingQuestions,
  votingSurveyTexts,
  votingEligibleVoters,
  votingBallots,
  votingBallotChoices,
};

const CONNECTION_TIMEOUT_MS = 5000;
interface Database {
  readonly pool: Pool;
  readonly db: NodePgDatabase<typeof schema>;
}
function createDatabase(url: string): Database {
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: CONNECTION_TIMEOUT_MS });
  return { pool, db: drizzle(pool, { schema }) };
}

export { createDatabase, type Database };
