-- Freeze the proposal at the version voters are asked to approve. Older rows can
-- be backfilled only if their source draft still has exactly that version.
ALTER TABLE "state_reform_votes" ADD COLUMN "configuration" jsonb;
--> statement-breakpoint
UPDATE state_reform_votes AS proposal
SET configuration = draft.configuration
FROM state_creation_drafts AS draft
WHERE draft.id = proposal.draft_id AND draft.version = proposal.version;
--> statement-breakpoint
ALTER TABLE state_reform_votes ALTER COLUMN configuration SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "votings" ADD COLUMN "subject" jsonb;
--> statement-breakpoint
CREATE TRIGGER reform_proposal_immutable BEFORE UPDATE OR DELETE ON state_reform_votes
FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
