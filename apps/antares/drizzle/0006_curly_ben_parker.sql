CREATE TABLE "state_reform_approvals" (
	"draft_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"office_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "state_reform_approvals_draft_id_version_office_id_pk" PRIMARY KEY("draft_id","version","office_id")
);
--> statement-breakpoint
CREATE TABLE "state_reform_votes" (
	"draft_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"voting_id" uuid NOT NULL,
	"approval_option_id" uuid NOT NULL,
	CONSTRAINT "state_reform_votes_draft_id_version_pk" PRIMARY KEY("draft_id","version")
);
--> statement-breakpoint
ALTER TABLE "state_reform_approvals" ADD CONSTRAINT "state_reform_approvals_draft_id_state_creation_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."state_creation_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_reform_approvals" ADD CONSTRAINT "state_reform_approvals_office_id_state_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."state_offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_reform_approvals" ADD CONSTRAINT "state_reform_approvals_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_reform_votes" ADD CONSTRAINT "state_reform_votes_draft_id_state_creation_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."state_creation_drafts"("id") ON DELETE no action ON UPDATE no action;