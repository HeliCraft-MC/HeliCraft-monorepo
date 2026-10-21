CREATE TABLE "company_share_acceptances" (
	"event_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"consent_id" uuid NOT NULL,
	CONSTRAINT "company_share_acceptances_event_id_subject_id_pk" PRIMARY KEY("event_id","subject_id"),
	CONSTRAINT "company_share_acceptances_consent_id_unique" UNIQUE("consent_id")
);
--> statement-breakpoint
CREATE TABLE "company_share_consent_revocations" (
	"consent_id" uuid PRIMARY KEY NOT NULL,
	"actor_id" uuid NOT NULL,
	"company_decision_id" uuid,
	"state_directive_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_share_consent_revocations_company_decision_id_unique" UNIQUE("company_decision_id"),
	CONSTRAINT "company_share_consent_revocations_state_directive_id_unique" UNIQUE("state_directive_id"),
	CONSTRAINT "company_share_revocation_one_source" CHECK (num_nonnulls("company_share_consent_revocations"."company_decision_id", "company_share_consent_revocations"."state_directive_id") <= 1)
);
--> statement-breakpoint
CREATE TABLE "company_share_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"company_decision_id" uuid,
	"state_directive_id" uuid,
	"idempotency_key" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_share_consents_company_decision_id_unique" UNIQUE("company_decision_id"),
	CONSTRAINT "company_share_consents_state_directive_id_unique" UNIQUE("state_directive_id"),
	CONSTRAINT "company_share_consent_one_source" CHECK (num_nonnulls("company_share_consents"."company_decision_id", "company_share_consents"."state_directive_id") <= 1)
);
--> statement-breakpoint
CREATE TABLE "company_share_operations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"issuer_id" uuid NOT NULL,
	"issuer_revision_id" uuid NOT NULL,
	"terms" jsonb NOT NULL,
	"terms_hash" text NOT NULL,
	"created_by" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_share_events" ADD COLUMN "operation_id" uuid;--> statement-breakpoint
ALTER TABLE "company_share_acceptances" ADD CONSTRAINT "company_share_acceptances_subject_id_legal_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."legal_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_acceptances" ADD CONSTRAINT "company_share_acceptances_consent_id_company_share_consents_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."company_share_consents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_consent_revocations" ADD CONSTRAINT "company_share_consent_revocations_consent_id_company_share_consents_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."company_share_consents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_consent_revocations" ADD CONSTRAINT "company_share_consent_revocations_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_consent_revocations" ADD CONSTRAINT "company_share_consent_revocations_company_decision_id_company_decisions_id_fk" FOREIGN KEY ("company_decision_id") REFERENCES "public"."company_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_consent_revocations" ADD CONSTRAINT "company_share_consent_revocations_state_directive_id_monetary_directives_id_fk" FOREIGN KEY ("state_directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_consents" ADD CONSTRAINT "company_share_consents_operation_id_company_share_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."company_share_operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_consents" ADD CONSTRAINT "company_share_consents_subject_id_legal_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."legal_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_consents" ADD CONSTRAINT "company_share_consents_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_consents" ADD CONSTRAINT "company_share_consents_company_decision_id_company_decisions_id_fk" FOREIGN KEY ("company_decision_id") REFERENCES "public"."company_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_consents" ADD CONSTRAINT "company_share_consents_state_directive_id_monetary_directives_id_fk" FOREIGN KEY ("state_directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_operations" ADD CONSTRAINT "company_share_operations_issuer_id_companies_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_operations" ADD CONSTRAINT "company_share_operations_issuer_revision_id_company_revisions_id_fk" FOREIGN KEY ("issuer_revision_id") REFERENCES "public"."company_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_operations" ADD CONSTRAINT "company_share_operations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_share_consent_command" ON "company_share_consents" USING btree ("actor_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "company_share_consent_recipient" ON "company_share_consents" USING btree ("subject_id","operation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_share_operation_command" ON "company_share_operations" USING btree ("created_by","idempotency_key");--> statement-breakpoint
CREATE INDEX "company_share_operation_issuer" ON "company_share_operations" USING btree ("issuer_id","created_at");--> statement-breakpoint
ALTER TABLE "company_share_events" ADD CONSTRAINT "company_share_events_operation_id_company_share_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."company_share_operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_events" ADD CONSTRAINT "company_share_events_operation_id_unique" UNIQUE("operation_id");