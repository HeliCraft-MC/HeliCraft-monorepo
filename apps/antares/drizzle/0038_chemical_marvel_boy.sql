ALTER TABLE "economic_operations" DROP CONSTRAINT "economic_operations_recipient_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tax_assessments" DROP CONSTRAINT "tax_assessments_taxpayer_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tax_fractional_balances" DROP CONSTRAINT "tax_fractional_balances_taxpayer_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "company_decisions" ADD COLUMN "tax_quote_id" uuid;--> statement-breakpoint
ALTER TABLE "economic_operations" ADD COLUMN "initiator_id" uuid;--> statement-breakpoint
ALTER TABLE "economic_operations" ADD COLUMN "sender_id" uuid;--> statement-breakpoint
ALTER TABLE "economic_operations" ADD COLUMN "sender_kind" text DEFAULT 'PLAYER' NOT NULL;--> statement-breakpoint
ALTER TABLE "economic_operations" ADD COLUMN "recipient_kind" text DEFAULT 'PLAYER' NOT NULL;--> statement-breakpoint
ALTER TABLE "economic_operations" ADD COLUMN "company_decision_id" uuid;--> statement-breakpoint
ALTER TABLE "tax_assessment_claims" ADD COLUMN "regime_revision_id" uuid;--> statement-breakpoint
-- Keep historical calculations and journals untouched while normalizing their original player identities.
INSERT INTO legal_subjects (id, kind, player_id)
SELECT id, 'PLAYER', id FROM users ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
ALTER TABLE economic_operations DISABLE TRIGGER economic_operation_history;
--> statement-breakpoint
UPDATE economic_operations SET initiator_id = actor_id, sender_id = actor_id;
--> statement-breakpoint
ALTER TABLE economic_operations ENABLE TRIGGER economic_operation_history;
--> statement-breakpoint
ALTER TABLE economic_operations ALTER COLUMN initiator_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE economic_operations ALTER COLUMN sender_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "economic_operations" ADD CONSTRAINT "economic_operations_initiator_id_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_operations" ADD CONSTRAINT "economic_operations_sender_id_legal_subjects_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."legal_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_operations" ADD CONSTRAINT "economic_operations_recipient_id_legal_subjects_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."legal_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_assessment_claims" ADD CONSTRAINT "tax_assessment_claims_regime_revision_id_tax_law_revisions_id_fk" FOREIGN KEY ("regime_revision_id") REFERENCES "public"."tax_law_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_taxpayer_id_legal_subjects_id_fk" FOREIGN KEY ("taxpayer_id") REFERENCES "public"."legal_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_fractional_balances" ADD CONSTRAINT "tax_fractional_balances_taxpayer_id_legal_subjects_id_fk" FOREIGN KEY ("taxpayer_id") REFERENCES "public"."legal_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_decisions" ADD CONSTRAINT "company_decisions_tax_quote_id_unique" UNIQUE("tax_quote_id");--> statement-breakpoint
ALTER TABLE "economic_operations" ADD CONSTRAINT "economic_operations_company_decision_id_unique" UNIQUE("company_decision_id");