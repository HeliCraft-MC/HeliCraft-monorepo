CREATE TABLE "company_branch_applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"branch_id" uuid NOT NULL,
	"policy_revision_id" uuid NOT NULL,
	"status" text NOT NULL,
	"review_directive_id" uuid,
	"completion_decision_id" uuid,
	"reviewed_by" uuid,
	"review_reason" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"database_transaction" text DEFAULT pg_current_xact_id()::text NOT NULL,
	CONSTRAINT "company_branch_applications_review_directive_id_unique" UNIQUE("review_directive_id"),
	CONSTRAINT "company_branch_applications_completion_decision_id_unique" UNIQUE("completion_decision_id"),
	CONSTRAINT "company_branch_application_status" CHECK ("company_branch_applications"."status" in ('PENDING','APPROVED','REJECTED','SUPERSEDED','CANCELLED'))
);
--> statement-breakpoint
CREATE TABLE "company_branch_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"company_decision_id" uuid,
	"state_directive_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"database_transaction" text DEFAULT pg_current_xact_id()::text NOT NULL,
	CONSTRAINT "company_branch_events_company_decision_id_unique" UNIQUE("company_decision_id"),
	CONSTRAINT "company_branch_events_state_directive_id_unique" UNIQUE("state_directive_id"),
	CONSTRAINT "company_branch_event_source" CHECK (num_nonnulls("company_branch_events"."company_decision_id", "company_branch_events"."state_directive_id") = 1),
	CONSTRAINT "company_branch_event_status" CHECK (("company_branch_events"."from_status" is null or "company_branch_events"."from_status" in ('PENDING_REGISTRATION','ACTIVE','REJECTED','CLOSED')) and "company_branch_events"."to_status" in ('PENDING_REGISTRATION','ACTIVE','REJECTED','CLOSED'))
);
--> statement-breakpoint
CREATE TABLE "company_branches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"state_id" uuid NOT NULL,
	"status" text NOT NULL,
	"current_application_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_branch_status" CHECK ("company_branches"."status" in ('PENDING_REGISTRATION','ACTIVE','REJECTED','CLOSED'))
);
--> statement-breakpoint
ALTER TABLE "company_branch_applications" ADD CONSTRAINT "company_branch_applications_id_company_decisions_id_fk" FOREIGN KEY ("id") REFERENCES "public"."company_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_branch_applications" ADD CONSTRAINT "company_branch_applications_branch_id_company_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."company_branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_branch_applications" ADD CONSTRAINT "company_branch_applications_policy_revision_id_company_registration_policy_revisions_id_fk" FOREIGN KEY ("policy_revision_id") REFERENCES "public"."company_registration_policy_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_branch_applications" ADD CONSTRAINT "company_branch_applications_review_directive_id_monetary_directives_id_fk" FOREIGN KEY ("review_directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_branch_applications" ADD CONSTRAINT "company_branch_applications_completion_decision_id_company_decisions_id_fk" FOREIGN KEY ("completion_decision_id") REFERENCES "public"."company_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_branch_applications" ADD CONSTRAINT "company_branch_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_branch_events" ADD CONSTRAINT "company_branch_events_branch_id_company_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."company_branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_branch_events" ADD CONSTRAINT "company_branch_events_application_id_company_branch_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."company_branch_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_branch_events" ADD CONSTRAINT "company_branch_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_branch_events" ADD CONSTRAINT "company_branch_events_company_decision_id_company_decisions_id_fk" FOREIGN KEY ("company_decision_id") REFERENCES "public"."company_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_branch_events" ADD CONSTRAINT "company_branch_events_state_directive_id_monetary_directives_id_fk" FOREIGN KEY ("state_directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_branches" ADD CONSTRAINT "company_branches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_branches" ADD CONSTRAINT "company_branches_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_branch_application_scope" ON "company_branch_applications" USING btree ("id","branch_id");--> statement-breakpoint
CREATE INDEX "company_branch_pending" ON "company_branch_applications" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "company_branch_one_pending" ON "company_branch_applications" USING btree ("branch_id") WHERE "company_branch_applications"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "company_branch_history" ON "company_branch_events" USING btree ("branch_id","created_at");--> statement-breakpoint
CREATE INDEX "company_branch_owner" ON "company_branches" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "company_branch_host" ON "company_branches" USING btree ("state_id","status");