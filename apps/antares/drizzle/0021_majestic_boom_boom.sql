CREATE TABLE "tax_fractional_balances" (
	"key" text PRIMARY KEY NOT NULL,
	"taxpayer_id" uuid NOT NULL,
	"currency_id" uuid NOT NULL,
	"obligation_key" text NOT NULL,
	"creditor_state_id" uuid NOT NULL,
	"beneficiary_kind" text NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"remainder" numeric(38, 0) DEFAULT '0' NOT NULL,
	CONSTRAINT "tax_fractional_range" CHECK ("tax_fractional_balances"."remainder" >= 0 and "tax_fractional_balances"."remainder" < 100000000),
	CONSTRAINT "tax_fractional_beneficiary" CHECK ("tax_fractional_balances"."beneficiary_kind" in ('TREASURY','CENTRAL_BANK'))
);
--> statement-breakpoint
CREATE TABLE "tax_fractional_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"balance_key" text NOT NULL,
	"exact_numerator" numeric(38, 0) NOT NULL,
	"remainder_before" numeric(38, 0) NOT NULL,
	"remainder_after" numeric(38, 0) NOT NULL,
	"collected_minor" numeric(38, 0) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tax_fractional_movement_range" CHECK ("tax_fractional_movements"."exact_numerator" >= 0 and "tax_fractional_movements"."remainder_before" >= 0 and "tax_fractional_movements"."remainder_before" < 100000000 and "tax_fractional_movements"."remainder_after" >= 0 and "tax_fractional_movements"."remainder_after" < 100000000 and "tax_fractional_movements"."collected_minor" >= 0),
	CONSTRAINT "tax_fractional_conservation" CHECK ("tax_fractional_movements"."remainder_before" + "tax_fractional_movements"."exact_numerator" = "tax_fractional_movements"."collected_minor" * 100000000 + "tax_fractional_movements"."remainder_after")
);
--> statement-breakpoint
ALTER TABLE "tax_fractional_balances" ADD CONSTRAINT "tax_fractional_balances_taxpayer_id_users_id_fk" FOREIGN KEY ("taxpayer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_fractional_balances" ADD CONSTRAINT "tax_fractional_balances_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_fractional_balances" ADD CONSTRAINT "tax_fractional_balances_creditor_state_id_states_id_fk" FOREIGN KEY ("creditor_state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_fractional_movements" ADD CONSTRAINT "tax_fractional_movements_assessment_id_tax_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."tax_assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_fractional_movements" ADD CONSTRAINT "tax_fractional_movements_balance_key_tax_fractional_balances_key_fk" FOREIGN KEY ("balance_key") REFERENCES "public"."tax_fractional_balances"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tax_fractional_identity" ON "tax_fractional_balances" USING btree ("taxpayer_id","currency_id","obligation_key","creditor_state_id","beneficiary_kind","beneficiary_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tax_fractional_assessment_once" ON "tax_fractional_movements" USING btree ("assessment_id","balance_key");