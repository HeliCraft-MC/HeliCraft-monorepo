CREATE TABLE "fx_exchange_journals" (
	"exchange_id" uuid NOT NULL,
	"leg" text NOT NULL,
	"journal_id" uuid NOT NULL,
	CONSTRAINT "fx_exchange_journals_exchange_id_leg_pk" PRIMARY KEY("exchange_id","leg"),
	CONSTRAINT "fx_exchange_journals_journal_id_unique" UNIQUE("journal_id"),
	CONSTRAINT "fx_journal_leg" CHECK ("fx_exchange_journals"."leg" in ('RECEIVE','PROVIDE'))
);
--> statement-breakpoint
CREATE TABLE "fx_exchanges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event" text DEFAULT 'FX_EXCHANGE' NOT NULL,
	"actor_id" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"command_hash" text NOT NULL,
	"offer_id" uuid,
	"trade_id" uuid,
	"quote_id" uuid,
	"receive_currency_id" uuid NOT NULL,
	"provide_currency_id" uuid NOT NULL,
	"receive_minor" numeric(38, 0) NOT NULL,
	"provide_minor" numeric(38, 0) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"database_transaction" text DEFAULT pg_current_xact_id()::text NOT NULL,
	CONSTRAINT "fx_exchanges_trade_id_unique" UNIQUE("trade_id"),
	CONSTRAINT "fx_exchanges_quote_id_unique" UNIQUE("quote_id"),
	CONSTRAINT "fx_exchange_context" CHECK ("fx_exchanges"."event" = 'FX_EXCHANGE' and "fx_exchanges"."receive_currency_id" <> "fx_exchanges"."provide_currency_id" and "fx_exchanges"."receive_minor" > 0 and "fx_exchanges"."provide_minor" > 0 and (("fx_exchanges"."offer_id" is not null and "fx_exchanges"."quote_id" is not null and "fx_exchanges"."trade_id" is null) or ("fx_exchanges"."offer_id" is null and "fx_exchanges"."quote_id" is null and "fx_exchanges"."trade_id" is not null)))
);
--> statement-breakpoint
CREATE TABLE "fx_interbank_approvals" (
	"directive_id" uuid PRIMARY KEY NOT NULL,
	"trade_id" uuid NOT NULL,
	"state_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_interbank_trades" (
	"id" uuid PRIMARY KEY NOT NULL,
	"terms" jsonb NOT NULL,
	"terms_hash" text NOT NULL,
	"first_state_id" uuid NOT NULL,
	"second_state_id" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fx_trade_parties" CHECK ("fx_interbank_trades"."first_state_id" <> "fx_interbank_trades"."second_state_id"),
	CONSTRAINT "fx_trade_status" CHECK ("fx_interbank_trades"."status" in ('PENDING','SETTLED'))
);
--> statement-breakpoint
CREATE TABLE "fx_offer_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"remaining_before" numeric(38, 0) NOT NULL,
	"remaining_after" numeric(38, 0) NOT NULL,
	"directive_id" uuid,
	"exchange_id" uuid,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"database_transaction" text DEFAULT pg_current_xact_id()::text NOT NULL,
	CONSTRAINT "fx_offer_events_directive_id_unique" UNIQUE("directive_id"),
	CONSTRAINT "fx_offer_events_exchange_id_unique" UNIQUE("exchange_id"),
	CONSTRAINT "fx_offer_event_kind" CHECK ("fx_offer_events"."kind" in ('PUBLISH','FILL','CANCEL','EXPIRE'))
);
--> statement-breakpoint
CREATE TABLE "fx_offers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"state_id" uuid NOT NULL,
	"bank_id" uuid NOT NULL,
	"publish_directive_id" uuid NOT NULL,
	"terms" jsonb NOT NULL,
	"terms_hash" text NOT NULL,
	"receive_currency_id" uuid NOT NULL,
	"provide_currency_id" uuid NOT NULL,
	"provide_per_lot_minor" numeric(38, 0) NOT NULL,
	"remaining_lots" numeric(38, 0) NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"database_transaction" text DEFAULT pg_current_xact_id()::text NOT NULL,
	CONSTRAINT "fx_offers_publish_directive_id_unique" UNIQUE("publish_directive_id"),
	CONSTRAINT "fx_offer_status" CHECK ("fx_offers"."status" in ('ACTIVE','FILLED','CANCELLED','EXPIRED')),
	CONSTRAINT "fx_offer_different_currencies" CHECK ("fx_offers"."receive_currency_id" <> "fx_offers"."provide_currency_id"),
	CONSTRAINT "fx_offer_remaining" CHECK ("fx_offers"."remaining_lots" >= 0 and "fx_offers"."remaining_lots" < 1000000000000000000000000000000),
	CONSTRAINT "fx_offer_positive_lot" CHECK ("fx_offers"."provide_per_lot_minor" > 0 and "fx_offers"."provide_per_lot_minor" < 1000000000000000000000000000000)
);
--> statement-breakpoint
CREATE TABLE "fx_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"terms_hash" text NOT NULL,
	"lots" numeric(38, 0) NOT NULL,
	"receive_minor" numeric(38, 0) NOT NULL,
	"provide_minor" numeric(38, 0) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fx_exchange_journals" ADD CONSTRAINT "fx_exchange_journals_exchange_id_fx_exchanges_id_fk" FOREIGN KEY ("exchange_id") REFERENCES "public"."fx_exchanges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_exchange_journals" ADD CONSTRAINT "fx_exchange_journals_journal_id_ledger_transactions_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_exchanges" ADD CONSTRAINT "fx_exchanges_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_exchanges" ADD CONSTRAINT "fx_exchanges_offer_id_fx_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."fx_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_exchanges" ADD CONSTRAINT "fx_exchanges_trade_id_fx_interbank_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."fx_interbank_trades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_exchanges" ADD CONSTRAINT "fx_exchanges_quote_id_fx_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."fx_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_exchanges" ADD CONSTRAINT "fx_exchanges_receive_currency_id_currencies_id_fk" FOREIGN KEY ("receive_currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_exchanges" ADD CONSTRAINT "fx_exchanges_provide_currency_id_currencies_id_fk" FOREIGN KEY ("provide_currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_interbank_approvals" ADD CONSTRAINT "fx_interbank_approvals_directive_id_monetary_directives_id_fk" FOREIGN KEY ("directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_interbank_approvals" ADD CONSTRAINT "fx_interbank_approvals_trade_id_fx_interbank_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."fx_interbank_trades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_interbank_approvals" ADD CONSTRAINT "fx_interbank_approvals_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_interbank_trades" ADD CONSTRAINT "fx_interbank_trades_first_state_id_states_id_fk" FOREIGN KEY ("first_state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_interbank_trades" ADD CONSTRAINT "fx_interbank_trades_second_state_id_states_id_fk" FOREIGN KEY ("second_state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_offer_events" ADD CONSTRAINT "fx_offer_events_offer_id_fx_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."fx_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_offer_events" ADD CONSTRAINT "fx_offer_events_directive_id_monetary_directives_id_fk" FOREIGN KEY ("directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_offer_events" ADD CONSTRAINT "fx_offer_events_exchange_id_fx_exchanges_id_fk" FOREIGN KEY ("exchange_id") REFERENCES "public"."fx_exchanges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_offer_events" ADD CONSTRAINT "fx_offer_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_offers" ADD CONSTRAINT "fx_offers_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_offers" ADD CONSTRAINT "fx_offers_bank_id_central_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."central_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_offers" ADD CONSTRAINT "fx_offers_publish_directive_id_monetary_directives_id_fk" FOREIGN KEY ("publish_directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_offers" ADD CONSTRAINT "fx_offers_receive_currency_id_currencies_id_fk" FOREIGN KEY ("receive_currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_offers" ADD CONSTRAINT "fx_offers_provide_currency_id_currencies_id_fk" FOREIGN KEY ("provide_currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_quotes" ADD CONSTRAINT "fx_quotes_offer_id_fx_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."fx_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_quotes" ADD CONSTRAINT "fx_quotes_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fx_exchange_idempotency" ON "fx_exchanges" USING btree ("actor_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "fx_offer_one_atomic_transition" ON "fx_offer_events" USING btree ("offer_id","database_transaction");--> statement-breakpoint
CREATE INDEX "fx_offer_reserve" ON "fx_offers" USING btree ("bank_id","provide_currency_id","status");