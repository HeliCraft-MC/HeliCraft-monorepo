DROP INDEX "voting_one_ballot";--> statement-breakpoint
ALTER TABLE "voting_eligible_voters" DROP CONSTRAINT "voting_eligible_voters_voting_id_user_id_pk";--> statement-breakpoint
ALTER TABLE "voting_eligible_voters" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "voting_eligible_voters" ALTER COLUMN "weight" SET DATA TYPE numeric(38, 0);--> statement-breakpoint
ALTER TABLE "voting_eligible_voters" ALTER COLUMN "weight" SET DEFAULT '1';--> statement-breakpoint
ALTER TABLE "voting_ballots" ADD COLUMN "voter_id" uuid;--> statement-breakpoint
ALTER TABLE "voting_ballots" ADD COLUMN "company_decision_id" uuid;--> statement-breakpoint
ALTER TABLE "voting_ballots" ADD COLUMN "state_directive_id" uuid;--> statement-breakpoint
ALTER TABLE "voting_eligible_voters" ADD COLUMN "voter_id" uuid;--> statement-breakpoint
ALTER TABLE "voting_eligible_voters" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
ALTER TABLE "votings" ADD COLUMN "company_revision_id" uuid;--> statement-breakpoint
-- Preserve every existing voter and ballot identity before enforcing the new exact subject key.
UPDATE "voting_eligible_voters" SET "voter_id" = "user_id";--> statement-breakpoint
UPDATE "voting_ballots" SET "voter_id" = "user_id";--> statement-breakpoint
ALTER TABLE "voting_eligible_voters" ALTER COLUMN "voter_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "voting_ballots" ALTER COLUMN "voter_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "voting_eligible_voters" ADD CONSTRAINT "voting_eligible_voters_voting_id_voter_id_pk" PRIMARY KEY("voting_id","voter_id");--> statement-breakpoint
ALTER TABLE "voting_ballots" ADD CONSTRAINT "voting_ballot_frozen_voter" FOREIGN KEY ("voting_id","voter_id") REFERENCES "public"."voting_eligible_voters"("voting_id","voter_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_eligible_voters" ADD CONSTRAINT "voting_eligible_voters_subject_id_legal_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."legal_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votings" ADD CONSTRAINT "votings_company_revision_id_company_revisions_id_fk" FOREIGN KEY ("company_revision_id") REFERENCES "public"."company_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "voting_one_ballot" ON "voting_ballots" USING btree ("voting_id","voter_id") WHERE "voting_ballots"."repeat_key" IS NULL;--> statement-breakpoint
ALTER TABLE "voting_eligible_voters" ADD CONSTRAINT "voting_voter_identity" CHECK ((
      "voting_eligible_voters"."user_id" is not null and "voting_eligible_voters"."subject_id" is null and "voting_eligible_voters"."voter_id" = "voting_eligible_voters"."user_id"
    ) or (
      "voting_eligible_voters"."user_id" is null and "voting_eligible_voters"."subject_id" is not null and "voting_eligible_voters"."voter_id" = "voting_eligible_voters"."subject_id"
    ));
