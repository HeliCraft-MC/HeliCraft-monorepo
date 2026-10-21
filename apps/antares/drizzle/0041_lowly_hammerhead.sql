ALTER TABLE "fx_exchanges" ADD COLUMN "first_approval_id" uuid;--> statement-breakpoint
ALTER TABLE "fx_exchanges" ADD COLUMN "second_approval_id" uuid;--> statement-breakpoint
ALTER TABLE "fx_interbank_approvals" ADD COLUMN "actor_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "fx_interbank_approvals" ADD COLUMN "database_transaction" text DEFAULT pg_current_xact_id()::text NOT NULL;--> statement-breakpoint
ALTER TABLE "fx_exchanges" ADD CONSTRAINT "fx_exchanges_first_approval_id_fx_interbank_approvals_directive_id_fk" FOREIGN KEY ("first_approval_id") REFERENCES "public"."fx_interbank_approvals"("directive_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_exchanges" ADD CONSTRAINT "fx_exchanges_second_approval_id_fx_interbank_approvals_directive_id_fk" FOREIGN KEY ("second_approval_id") REFERENCES "public"."fx_interbank_approvals"("directive_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_interbank_approvals" ADD CONSTRAINT "fx_interbank_approvals_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;