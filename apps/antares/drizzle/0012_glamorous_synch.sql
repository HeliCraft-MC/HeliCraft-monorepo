CREATE TABLE "voting_survey_texts" (
	"voting_id" uuid NOT NULL,
	"key" text NOT NULL,
	"text_id" uuid NOT NULL,
	CONSTRAINT "voting_survey_texts_voting_id_key_pk" PRIMARY KEY("voting_id","key")
);
--> statement-breakpoint
DROP INDEX "voting_one_ballot";--> statement-breakpoint
ALTER TABLE "voting_ballots" ADD COLUMN "answers" jsonb;--> statement-breakpoint
ALTER TABLE "voting_ballots" ADD COLUMN "repeat_key" uuid;--> statement-breakpoint
ALTER TABLE "voting_survey_texts" ADD CONSTRAINT "voting_survey_texts_voting_id_votings_id_fk" FOREIGN KEY ("voting_id") REFERENCES "public"."votings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_survey_texts" ADD CONSTRAINT "voting_survey_texts_text_id_localized_texts_id_fk" FOREIGN KEY ("text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "voting_one_ballot" ON "voting_ballots" USING btree ("voting_id","user_id") WHERE "voting_ballots"."repeat_key" IS NULL;--> statement-breakpoint
ALTER TABLE "votings" DROP CONSTRAINT "voting_status_valid";
--> statement-breakpoint
ALTER TABLE "votings" ADD CONSTRAINT "voting_status_valid" CHECK ("status" IN ('DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED', 'ARCHIVED'));
