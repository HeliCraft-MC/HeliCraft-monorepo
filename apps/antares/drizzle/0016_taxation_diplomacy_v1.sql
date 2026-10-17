CREATE TABLE "economic_directive_documents" (
	"directive_id" uuid PRIMARY KEY NOT NULL,
	"text_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economic_journals" (
	"journal_id" uuid PRIMARY KEY NOT NULL,
	"operation_id" uuid NOT NULL,
	"assessment_id" uuid,
	"creditor_state_id" uuid
);
--> statement-breakpoint
CREATE TABLE "economic_operations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"currency_id" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"command_hash" text NOT NULL,
	"quote_id" uuid,
	"event" text NOT NULL,
	"calculation" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"database_transaction" text DEFAULT pg_current_xact_id()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_assessment_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"law_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"assessment_key" text NOT NULL,
	"taxpayer_id" uuid NOT NULL,
	"currency_id" uuid NOT NULL,
	"base_minor" numeric(38, 0) NOT NULL,
	"charge" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_law_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"law_id" uuid NOT NULL,
	"directive_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"status" text NOT NULL,
	"rule" jsonb NOT NULL,
	"name_text_id" uuid NOT NULL,
	"description_text_id" uuid NOT NULL,
	"document_text_id" uuid NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tax_law_revisions_directive_id_unique" UNIQUE("directive_id"),
	CONSTRAINT "tax_law_revision_status" CHECK ("tax_law_revisions"."status" in ('ACTIVE','REPEALED')),
	CONSTRAINT "tax_law_rate" CHECK (("tax_law_revisions"."rule"->>'rateBps')::integer between 0 and 10000)
);
--> statement-breakpoint
CREATE TABLE "tax_laws" (
	"id" uuid PRIMARY KEY NOT NULL,
	"state_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_office_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" uuid NOT NULL,
	"directive_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"status" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_offices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_id" uuid NOT NULL,
	"establishment_directive_id" uuid NOT NULL,
	"charter_directive_id" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tax_offices_state_id_unique" UNIQUE("state_id"),
	CONSTRAINT "tax_offices_establishment_directive_id_unique" UNIQUE("establishment_directive_id"),
	CONSTRAINT "tax_office_status" CHECK ("tax_offices"."status" in ('PENDING','ACTIVE','REJECTED','SUSPENDED'))
);
--> statement-breakpoint
CREATE TABLE "transfer_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"command_hash" text NOT NULL,
	"calculation_hash" text NOT NULL,
	"calculation" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treaties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text DEFAULT 'TAX_TREATY' NOT NULL,
	"proposer_state_id" uuid NOT NULL,
	"current_revision_id" uuid NOT NULL,
	"active_revision_id" uuid,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "treaty_status" CHECK ("treaties"."status" in ('DRAFT','PROPOSED','ACTIVE','REJECTED','TERMINATED'))
);
--> statement-breakpoint
CREATE TABLE "treaty_activations" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treaty_decisions" (
	"directive_id" uuid PRIMARY KEY NOT NULL,
	"revision_id" uuid NOT NULL,
	"state_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treaty_parties" (
	"treaty_id" uuid NOT NULL,
	"state_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "treaty_parties_treaty_id_state_id_pk" PRIMARY KEY("treaty_id","state_id"),
	CONSTRAINT "treaty_bilateral_position" CHECK ("treaty_parties"."position" in (0,1))
);
--> statement-breakpoint
CREATE TABLE "treaty_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"treaty_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"created_by" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"name_text_id" uuid NOT NULL,
	"description_text_id" uuid NOT NULL,
	"document_text_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "economic_directive_documents" ADD CONSTRAINT "economic_directive_documents_directive_id_monetary_directives_id_fk" FOREIGN KEY ("directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_directive_documents" ADD CONSTRAINT "economic_directive_documents_text_id_localized_texts_id_fk" FOREIGN KEY ("text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_journals" ADD CONSTRAINT "economic_journals_journal_id_ledger_transactions_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_journals" ADD CONSTRAINT "economic_journals_operation_id_economic_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."economic_operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_journals" ADD CONSTRAINT "economic_journals_assessment_id_tax_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."tax_assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_journals" ADD CONSTRAINT "economic_journals_creditor_state_id_states_id_fk" FOREIGN KEY ("creditor_state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_operations" ADD CONSTRAINT "economic_operations_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_operations" ADD CONSTRAINT "economic_operations_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_operations" ADD CONSTRAINT "economic_operations_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_operations" ADD CONSTRAINT "economic_operations_quote_id_transfer_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."transfer_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_assessment_claims" ADD CONSTRAINT "tax_assessment_claims_assessment_id_tax_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."tax_assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_assessment_claims" ADD CONSTRAINT "tax_assessment_claims_operation_id_economic_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."economic_operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_assessment_claims" ADD CONSTRAINT "tax_assessment_claims_law_id_tax_laws_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."tax_laws"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_assessment_claims" ADD CONSTRAINT "tax_assessment_claims_revision_id_tax_law_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."tax_law_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_operation_id_economic_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."economic_operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_taxpayer_id_users_id_fk" FOREIGN KEY ("taxpayer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_law_revisions" ADD CONSTRAINT "tax_law_revisions_law_id_tax_laws_id_fk" FOREIGN KEY ("law_id") REFERENCES "public"."tax_laws"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_law_revisions" ADD CONSTRAINT "tax_law_revisions_directive_id_monetary_directives_id_fk" FOREIGN KEY ("directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_law_revisions" ADD CONSTRAINT "tax_law_revisions_name_text_id_localized_texts_id_fk" FOREIGN KEY ("name_text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_law_revisions" ADD CONSTRAINT "tax_law_revisions_description_text_id_localized_texts_id_fk" FOREIGN KEY ("description_text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_law_revisions" ADD CONSTRAINT "tax_law_revisions_document_text_id_localized_texts_id_fk" FOREIGN KEY ("document_text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_laws" ADD CONSTRAINT "tax_laws_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_office_reviews" ADD CONSTRAINT "tax_office_reviews_office_id_tax_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."tax_offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_office_reviews" ADD CONSTRAINT "tax_office_reviews_directive_id_monetary_directives_id_fk" FOREIGN KEY ("directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_office_reviews" ADD CONSTRAINT "tax_office_reviews_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_offices" ADD CONSTRAINT "tax_offices_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_offices" ADD CONSTRAINT "tax_offices_establishment_directive_id_monetary_directives_id_fk" FOREIGN KEY ("establishment_directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_offices" ADD CONSTRAINT "tax_offices_charter_directive_id_monetary_directives_id_fk" FOREIGN KEY ("charter_directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_quotes" ADD CONSTRAINT "transfer_quotes_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treaties" ADD CONSTRAINT "treaties_proposer_state_id_states_id_fk" FOREIGN KEY ("proposer_state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treaty_activations" ADD CONSTRAINT "treaty_activations_revision_id_treaty_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."treaty_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treaty_decisions" ADD CONSTRAINT "treaty_decisions_directive_id_monetary_directives_id_fk" FOREIGN KEY ("directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treaty_decisions" ADD CONSTRAINT "treaty_decisions_revision_id_treaty_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."treaty_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treaty_decisions" ADD CONSTRAINT "treaty_decisions_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treaty_parties" ADD CONSTRAINT "treaty_parties_treaty_id_treaties_id_fk" FOREIGN KEY ("treaty_id") REFERENCES "public"."treaties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treaty_parties" ADD CONSTRAINT "treaty_parties_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treaty_revisions" ADD CONSTRAINT "treaty_revisions_treaty_id_treaties_id_fk" FOREIGN KEY ("treaty_id") REFERENCES "public"."treaties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treaty_revisions" ADD CONSTRAINT "treaty_revisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treaty_revisions" ADD CONSTRAINT "treaty_revisions_name_text_id_localized_texts_id_fk" FOREIGN KEY ("name_text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treaty_revisions" ADD CONSTRAINT "treaty_revisions_description_text_id_localized_texts_id_fk" FOREIGN KEY ("description_text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treaty_revisions" ADD CONSTRAINT "treaty_revisions_document_text_id_localized_texts_id_fk" FOREIGN KEY ("document_text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "economic_operation_idempotency" ON "economic_operations" USING btree ("actor_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "tax_law_once_per_event" ON "tax_assessment_claims" USING btree ("operation_id","law_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tax_assessment_once" ON "tax_assessments" USING btree ("operation_id","assessment_key");--> statement-breakpoint
CREATE UNIQUE INDEX "tax_law_revision_number" ON "tax_law_revisions" USING btree ("law_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "treaty_party_position" ON "treaty_parties" USING btree ("treaty_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "treaty_revision_number" ON "treaty_revisions" USING btree ("treaty_id","number");