CREATE TABLE "state_reform_proposal_texts" (
	"proposal_id" uuid NOT NULL,
	"path" text NOT NULL,
	"text_id" uuid NOT NULL,
	CONSTRAINT "state_reform_proposal_texts_proposal_id_path_pk" PRIMARY KEY("proposal_id","path")
);
--> statement-breakpoint
CREATE TABLE "state_reform_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"state_id" uuid NOT NULL,
	"base_revision_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"configuration_hash" text NOT NULL,
	"configuration" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "state_reform_proposal_texts" ADD CONSTRAINT "state_reform_proposal_texts_proposal_id_state_reform_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."state_reform_proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_reform_proposal_texts" ADD CONSTRAINT "state_reform_proposal_texts_text_id_localized_texts_id_fk" FOREIGN KEY ("text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_reform_proposals" ADD CONSTRAINT "state_reform_proposals_draft_id_state_creation_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."state_creation_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_reform_proposals" ADD CONSTRAINT "state_reform_proposals_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_reform_proposals" ADD CONSTRAINT "state_reform_proposals_base_revision_id_state_governance_revisions_id_fk" FOREIGN KEY ("base_revision_id") REFERENCES "public"."state_governance_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_reform_proposals" ADD CONSTRAINT "state_reform_proposals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reform_proposal_draft_version" ON "state_reform_proposals" USING btree ("draft_id","version");
--> statement-breakpoint
CREATE TRIGGER immutable_reform_proposal BEFORE UPDATE OR DELETE ON state_reform_proposals
FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER immutable_reform_proposal_text BEFORE UPDATE OR DELETE ON state_reform_proposal_texts
FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
