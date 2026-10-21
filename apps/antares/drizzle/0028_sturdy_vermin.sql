ALTER TABLE "company_revisions" ADD COLUMN "decision_id" uuid;--> statement-breakpoint
ALTER TABLE "company_revisions" ADD CONSTRAINT "company_revisions_decision_id_unique" UNIQUE("decision_id");