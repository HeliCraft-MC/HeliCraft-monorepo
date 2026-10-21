CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"registration_state_id" uuid,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"current_revision_id" uuid,
	"current_application_id" uuid,
	"issued_shares" numeric(38, 0) DEFAULT '0' NOT NULL,
	"founded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_status_valid" CHECK ("companies"."status" in ('DRAFT','PENDING_REGISTRATION','ACTIVE','REJECTED','SUSPENDED','CLOSED')),
	CONSTRAINT "company_issued_shares_range" CHECK ("companies"."issued_shares" >= 0 and "companies"."issued_shares" < 1000000000000000000000000000000)
);
--> statement-breakpoint
CREATE TABLE "company_approval_revocations" (
	"approval_id" uuid PRIMARY KEY NOT NULL,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_consent_revocations" (
	"consent_id" uuid PRIMARY KEY NOT NULL,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_decision_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"office_id" uuid NOT NULL,
	"holder_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_decision_texts" (
	"decision_id" uuid NOT NULL,
	"path" text NOT NULL,
	"text_id" uuid NOT NULL,
	CONSTRAINT "company_decision_texts_decision_id_path_pk" PRIMARY KEY("decision_id","path")
);
--> statement-breakpoint
CREATE TABLE "company_decision_votes" (
	"decision_id" uuid NOT NULL,
	"requirement_hash" text NOT NULL,
	"voting_id" uuid NOT NULL,
	"approval_option_id" uuid NOT NULL,
	CONSTRAINT "company_decision_votes_decision_id_requirement_hash_pk" PRIMARY KEY("decision_id","requirement_hash"),
	CONSTRAINT "company_decision_votes_voting_id_unique" UNIQUE("voting_id")
);
--> statement-breakpoint
CREATE TABLE "company_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"payload_hash" text NOT NULL,
	"database_transaction" text DEFAULT pg_current_xact_id()::text NOT NULL,
	"created_by" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_at" timestamp with time zone,
	"applied_by" uuid,
	"manual_reason" text,
	CONSTRAINT "company_decision_status" CHECK ("company_decisions"."status" in ('PENDING','APPLIED','CANCELLED'))
);
--> statement-breakpoint
CREATE TABLE "company_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"step" integer DEFAULT 0 NOT NULL,
	"configuration" jsonb NOT NULL,
	"submitted_application_id" uuid,
	"deleted_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_draft_version" CHECK ("company_drafts"."version" > 0 and "company_drafts"."step" >= 0)
);
--> statement-breakpoint
CREATE TABLE "company_formation_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"formation_hash" text NOT NULL,
	"role" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"company_decision_id" uuid,
	"state_directive_id" uuid,
	"idempotency_key" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_consent_role" CHECK ("company_formation_consents"."role" in ('FOUNDER','OFFICE_HOLDER'))
);
--> statement-breakpoint
CREATE TABLE "company_office_holders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"since" timestamp with time zone DEFAULT now() NOT NULL,
	"until" timestamp with time zone,
	CONSTRAINT "company_holder_interval" CHECK ("company_office_holders"."until" is null or "company_office_holders"."until" >= "company_office_holders"."since")
);
--> statement-breakpoint
CREATE TABLE "company_offices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_registration_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"policy_revision_id" uuid NOT NULL,
	"state_id" uuid NOT NULL,
	"applicant_id" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"command_hash" text NOT NULL,
	"fee_journal_id" uuid,
	"draft_id" uuid NOT NULL,
	"formation_hash" text NOT NULL,
	"total_shares" numeric(38, 0) NOT NULL,
	"allocations" jsonb NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"review_directive_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_registration_applications_fee_journal_id_unique" UNIQUE("fee_journal_id"),
	CONSTRAINT "company_registration_applications_draft_id_unique" UNIQUE("draft_id"),
	CONSTRAINT "company_registration_applications_review_directive_id_unique" UNIQUE("review_directive_id"),
	CONSTRAINT "company_application_status" CHECK ("company_registration_applications"."status" in ('PENDING','APPROVED','REJECTED')),
	CONSTRAINT "company_application_shares_positive" CHECK ("company_registration_applications"."total_shares" > 0 and "company_registration_applications"."total_shares" < 1000000000000000000000000000000)
);
--> statement-breakpoint
CREATE TABLE "company_registration_policy_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"previous_revision_id" uuid,
	"directive_id" uuid NOT NULL,
	"policy" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_registration_policy_revisions_directive_id_unique" UNIQUE("directive_id"),
	CONSTRAINT "company_registration_policy_positive" CHECK ("company_registration_policy_revisions"."number" > 0)
);
--> statement-breakpoint
CREATE TABLE "company_revision_texts" (
	"revision_id" uuid NOT NULL,
	"path" text NOT NULL,
	"text_id" uuid NOT NULL,
	CONSTRAINT "company_revision_texts_revision_id_path_pk" PRIMARY KEY("revision_id","path")
);
--> statement-breakpoint
CREATE TABLE "company_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"previous_revision_id" uuid,
	"actor_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"database_transaction" text DEFAULT pg_current_xact_id()::text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_revision_positive" CHECK ("company_revisions"."number" > 0)
);
--> statement-breakpoint
CREATE TABLE "company_share_balances" (
	"company_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"shares" numeric(38, 0) DEFAULT '0' NOT NULL,
	CONSTRAINT "company_share_balances_company_id_subject_id_pk" PRIMARY KEY("company_id","subject_id"),
	CONSTRAINT "company_share_nonnegative" CHECK ("company_share_balances"."shares" >= 0 and "company_share_balances"."shares" < 1000000000000000000000000000000)
);
--> statement-breakpoint
CREATE TABLE "company_share_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"shares" numeric(38, 0) NOT NULL,
	"from_subject_id" uuid,
	"to_subject_id" uuid,
	"application_id" uuid,
	"decision_id" uuid,
	"authorization_decision_id" uuid,
	"state_directive_id" uuid,
	"actor_id" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"database_transaction" text DEFAULT pg_current_xact_id()::text NOT NULL,
	CONSTRAINT "company_share_events_application_id_unique" UNIQUE("application_id"),
	CONSTRAINT "company_share_events_decision_id_unique" UNIQUE("decision_id"),
	CONSTRAINT "company_share_events_authorization_decision_id_unique" UNIQUE("authorization_decision_id"),
	CONSTRAINT "company_share_events_state_directive_id_unique" UNIQUE("state_directive_id"),
	CONSTRAINT "company_share_event_kind" CHECK ("company_share_events"."kind" in ('INITIAL','ISSUE','TRANSFER')),
	CONSTRAINT "company_share_event_positive" CHECK ("company_share_events"."shares" > 0 and "company_share_events"."shares" < 1000000000000000000000000000000),
	CONSTRAINT "company_share_event_source" CHECK (("company_share_events"."kind" = 'INITIAL' and "company_share_events"."application_id" is not null and "company_share_events"."decision_id" is null and "company_share_events"."from_subject_id" is null and "company_share_events"."to_subject_id" is null) or
    ("company_share_events"."kind" = 'ISSUE' and "company_share_events"."decision_id" is not null and "company_share_events"."application_id" is null and "company_share_events"."from_subject_id" is null and "company_share_events"."to_subject_id" is null) or
    ("company_share_events"."kind" = 'TRANSFER' and "company_share_events"."application_id" is null and "company_share_events"."from_subject_id" is not null and "company_share_events"."to_subject_id" is not null and "company_share_events"."from_subject_id" <> "company_share_events"."to_subject_id"))
);
--> statement-breakpoint
CREATE TABLE "company_share_postings" (
	"event_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"delta" numeric(38, 0) NOT NULL,
	CONSTRAINT "company_share_postings_event_id_subject_id_pk" PRIMARY KEY("event_id","subject_id"),
	CONSTRAINT "company_share_posting_nonzero" CHECK ("company_share_postings"."delta" <> 0)
);
--> statement-breakpoint
CREATE TABLE "company_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer DEFAULT 1 NOT NULL,
	"company_id" uuid NOT NULL,
	"previous_status" text NOT NULL,
	"status" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"application_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_subjects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"player_id" uuid,
	"state_id" uuid,
	"company_id" uuid,
	CONSTRAINT "legal_subject_identity" CHECK (num_nonnulls("legal_subjects"."player_id", "legal_subjects"."state_id", "legal_subjects"."company_id") = 1 and (
    ("legal_subjects"."kind" = 'PLAYER' and "legal_subjects"."player_id" is not null and "legal_subjects"."id" = "legal_subjects"."player_id") or
    ("legal_subjects"."kind" = 'STATE' and "legal_subjects"."state_id" is not null and "legal_subjects"."id" = "legal_subjects"."state_id") or
    ("legal_subjects"."kind" = 'COMPANY' and "legal_subjects"."company_id" is not null and "legal_subjects"."id" = "legal_subjects"."company_id")))
);
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_registration_state_id_states_id_fk" FOREIGN KEY ("registration_state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_approval_revocations" ADD CONSTRAINT "company_approval_revocations_approval_id_company_decision_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."company_decision_approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_approval_revocations" ADD CONSTRAINT "company_approval_revocations_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_consent_revocations" ADD CONSTRAINT "company_consent_revocations_consent_id_company_formation_consents_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."company_formation_consents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_consent_revocations" ADD CONSTRAINT "company_consent_revocations_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_decision_approvals" ADD CONSTRAINT "company_decision_approvals_decision_id_company_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."company_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_decision_approvals" ADD CONSTRAINT "company_decision_approvals_office_id_company_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."company_offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_decision_approvals" ADD CONSTRAINT "company_decision_approvals_holder_id_company_office_holders_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."company_office_holders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_decision_approvals" ADD CONSTRAINT "company_decision_approvals_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_decision_texts" ADD CONSTRAINT "company_decision_texts_decision_id_company_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."company_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_decision_texts" ADD CONSTRAINT "company_decision_texts_text_id_localized_texts_id_fk" FOREIGN KEY ("text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_decision_votes" ADD CONSTRAINT "company_decision_votes_decision_id_company_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."company_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_decision_votes" ADD CONSTRAINT "company_decision_votes_voting_id_votings_id_fk" FOREIGN KEY ("voting_id") REFERENCES "public"."votings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_decisions" ADD CONSTRAINT "company_decisions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_decisions" ADD CONSTRAINT "company_decisions_revision_id_company_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."company_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_decisions" ADD CONSTRAINT "company_decisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_decisions" ADD CONSTRAINT "company_decisions_applied_by_users_id_fk" FOREIGN KEY ("applied_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_drafts" ADD CONSTRAINT "company_drafts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_drafts" ADD CONSTRAINT "company_drafts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_formation_consents" ADD CONSTRAINT "company_formation_consents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_formation_consents" ADD CONSTRAINT "company_formation_consents_subject_id_legal_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."legal_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_formation_consents" ADD CONSTRAINT "company_formation_consents_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_formation_consents" ADD CONSTRAINT "company_formation_consents_state_directive_id_monetary_directives_id_fk" FOREIGN KEY ("state_directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_office_holders" ADD CONSTRAINT "company_office_holders_office_id_company_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."company_offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_office_holders" ADD CONSTRAINT "company_office_holders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_office_holders" ADD CONSTRAINT "company_office_holders_revision_id_company_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."company_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_offices" ADD CONSTRAINT "company_offices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_registration_applications" ADD CONSTRAINT "company_registration_applications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_registration_applications" ADD CONSTRAINT "company_registration_applications_revision_id_company_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."company_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_registration_applications" ADD CONSTRAINT "company_registration_applications_policy_revision_id_company_registration_policy_revisions_id_fk" FOREIGN KEY ("policy_revision_id") REFERENCES "public"."company_registration_policy_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_registration_applications" ADD CONSTRAINT "company_registration_applications_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_registration_applications" ADD CONSTRAINT "company_registration_applications_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_registration_applications" ADD CONSTRAINT "company_registration_applications_fee_journal_id_ledger_transactions_id_fk" FOREIGN KEY ("fee_journal_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_registration_applications" ADD CONSTRAINT "company_registration_applications_draft_id_company_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."company_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_registration_applications" ADD CONSTRAINT "company_registration_applications_review_directive_id_monetary_directives_id_fk" FOREIGN KEY ("review_directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_registration_policy_revisions" ADD CONSTRAINT "company_registration_policy_revisions_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_registration_policy_revisions" ADD CONSTRAINT "company_registration_policy_revisions_directive_id_monetary_directives_id_fk" FOREIGN KEY ("directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_revision_texts" ADD CONSTRAINT "company_revision_texts_revision_id_company_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."company_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_revision_texts" ADD CONSTRAINT "company_revision_texts_text_id_localized_texts_id_fk" FOREIGN KEY ("text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_revisions" ADD CONSTRAINT "company_revisions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_revisions" ADD CONSTRAINT "company_revisions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_balances" ADD CONSTRAINT "company_share_balances_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_balances" ADD CONSTRAINT "company_share_balances_subject_id_legal_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."legal_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_events" ADD CONSTRAINT "company_share_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_events" ADD CONSTRAINT "company_share_events_from_subject_id_legal_subjects_id_fk" FOREIGN KEY ("from_subject_id") REFERENCES "public"."legal_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_events" ADD CONSTRAINT "company_share_events_to_subject_id_legal_subjects_id_fk" FOREIGN KEY ("to_subject_id") REFERENCES "public"."legal_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_events" ADD CONSTRAINT "company_share_events_application_id_company_registration_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."company_registration_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_events" ADD CONSTRAINT "company_share_events_decision_id_company_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."company_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_events" ADD CONSTRAINT "company_share_events_authorization_decision_id_company_decisions_id_fk" FOREIGN KEY ("authorization_decision_id") REFERENCES "public"."company_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_events" ADD CONSTRAINT "company_share_events_state_directive_id_monetary_directives_id_fk" FOREIGN KEY ("state_directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_events" ADD CONSTRAINT "company_share_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_postings" ADD CONSTRAINT "company_share_postings_event_id_company_share_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."company_share_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_postings" ADD CONSTRAINT "company_share_postings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_postings" ADD CONSTRAINT "company_share_postings_subject_id_legal_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."legal_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_status_history" ADD CONSTRAINT "company_status_history_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_status_history" ADD CONSTRAINT "company_status_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_status_history" ADD CONSTRAINT "company_status_history_application_id_company_registration_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."company_registration_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_subjects" ADD CONSTRAINT "legal_subjects_player_id_users_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_subjects" ADD CONSTRAINT "legal_subjects_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_subjects" ADD CONSTRAINT "legal_subjects_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_registration_state" ON "companies" USING btree ("registration_state_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "company_decision_idempotency" ON "company_decisions" USING btree ("created_by","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "company_decision_identity" ON "company_decisions" USING btree ("id","company_id");--> statement-breakpoint
CREATE INDEX "company_decision_history" ON "company_decisions" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "company_draft_owner" ON "company_drafts" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "company_one_open_draft" ON "company_drafts" USING btree ("company_id") WHERE "company_drafts"."deleted_at" is null and "company_drafts"."submitted_application_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "company_consent_idempotency" ON "company_formation_consents" USING btree ("actor_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "company_holder_current" ON "company_office_holders" USING btree ("office_id","user_id") WHERE "company_office_holders"."until" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "company_application_identity" ON "company_registration_applications" USING btree ("id","company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_application_command" ON "company_registration_applications" USING btree ("applicant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "company_application_review" ON "company_registration_applications" USING btree ("state_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "company_registration_policy_number" ON "company_registration_policy_revisions" USING btree ("state_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "company_revision_number" ON "company_revisions" USING btree ("company_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "company_revision_identity" ON "company_revisions" USING btree ("id","company_id");--> statement-breakpoint
CREATE INDEX "company_share_owner" ON "company_share_balances" USING btree ("subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_share_idempotency" ON "company_share_events" USING btree ("actor_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "company_share_event_identity" ON "company_share_events" USING btree ("id","company_id");--> statement-breakpoint
CREATE INDEX "company_share_history" ON "company_share_events" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "company_status_number" ON "company_status_history" USING btree ("company_id","number");