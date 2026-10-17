CREATE TABLE "bank_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_id" uuid NOT NULL,
	"directive_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"status" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "central_banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_id" uuid NOT NULL,
	"establishment_directive_id" uuid NOT NULL,
	"charter_directive_id" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "central_banks_state_id_unique" UNIQUE("state_id"),
	CONSTRAINT "central_banks_establishment_directive_id_unique" UNIQUE("establishment_directive_id"),
	CONSTRAINT "central_bank_status" CHECK ("central_banks"."status" in ('PENDING','ACTIVE','REJECTED','SUSPENDED'))
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_id" uuid NOT NULL,
	"bank_id" uuid NOT NULL,
	"directive_id" uuid NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"supply_minor" numeric(38, 0) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "currencies_state_id_unique" UNIQUE("state_id"),
	CONSTRAINT "currencies_bank_id_unique" UNIQUE("bank_id"),
	CONSTRAINT "currencies_directive_id_unique" UNIQUE("directive_id"),
	CONSTRAINT "currencies_code_unique" UNIQUE("code"),
	CONSTRAINT "currency_supply" CHECK ("currencies"."supply_minor" >= 0 and "currencies"."supply_minor" < 1000000000000000000000000000000),
	CONSTRAINT "currency_status" CHECK ("currencies"."status" in ('ACTIVE','BLOCKED')),
	CONSTRAINT "currency_code" CHECK ("currencies"."code" ~ '^[A-Z][A-Z0-9]{2,11}$')
);
--> statement-breakpoint
CREATE TABLE "financial_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"currency_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"balance_minor" numeric(38, 0) DEFAULT '0' NOT NULL,
	CONSTRAINT "financial_account_kind" CHECK ("financial_accounts"."kind" in ('PLAYER','CENTRAL_BANK','TREASURY','ISSUANCE')),
	CONSTRAINT "financial_nonnegative" CHECK ("financial_accounts"."kind" = 'ISSUANCE' or "financial_accounts"."balance_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ledger_postings" (
	"transaction_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"currency_id" uuid NOT NULL,
	"delta_minor" numeric(38, 0) NOT NULL,
	CONSTRAINT "ledger_postings_transaction_id_account_id_pk" PRIMARY KEY("transaction_id","account_id"),
	CONSTRAINT "ledger_nonzero" CHECK ("ledger_postings"."delta_minor" <> 0)
);
--> statement-breakpoint
CREATE TABLE "ledger_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"currency_id" uuid NOT NULL,
	"directive_id" uuid,
	"policy_revision_id" uuid,
	"actor_id" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"kind" text NOT NULL,
	"amount_minor" numeric(38, 0) NOT NULL,
	"purpose" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"database_transaction" text DEFAULT pg_current_xact_id()::text NOT NULL,
	CONSTRAINT "ledger_transactions_directive_id_unique" UNIQUE("directive_id"),
	CONSTRAINT "ledger_amount" CHECK ("ledger_transactions"."amount_minor" > 0 and "ledger_transactions"."amount_minor" < 1000000000000000000000000000000),
	CONSTRAINT "ledger_kind" CHECK ("ledger_transactions"."kind" in ('ISSUE','BURN','TRANSFER'))
);
--> statement-breakpoint
CREATE TABLE "monetary_approvals" (
	"directive_id" uuid NOT NULL,
	"office_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monetary_approvals_directive_id_office_id_actor_id_pk" PRIMARY KEY("directive_id","office_id","actor_id")
);
--> statement-breakpoint
CREATE TABLE "monetary_directives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_id" uuid NOT NULL,
	"governance_revision_id" uuid NOT NULL,
	"policy_revision_id" uuid,
	"payload" jsonb NOT NULL,
	"name_text_id" uuid,
	"description_text_id" uuid,
	"payload_hash" text NOT NULL,
	"created_by" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_at" timestamp with time zone,
	CONSTRAINT "monetary_directive_status" CHECK ("monetary_directives"."status" in ('PENDING','APPLIED','CANCELLED'))
);
--> statement-breakpoint
CREATE TABLE "monetary_policy_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"currency_id" uuid NOT NULL,
	"directive_id" uuid NOT NULL,
	"limits" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monetary_policy_revisions_directive_id_unique" UNIQUE("directive_id")
);
--> statement-breakpoint
CREATE TABLE "monetary_votes" (
	"directive_id" uuid PRIMARY KEY NOT NULL,
	"voting_id" uuid NOT NULL,
	"approval_option_id" uuid NOT NULL,
	CONSTRAINT "monetary_votes_voting_id_unique" UNIQUE("voting_id")
);
--> statement-breakpoint
ALTER TABLE "bank_reviews" ADD CONSTRAINT "bank_reviews_bank_id_central_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."central_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reviews" ADD CONSTRAINT "bank_reviews_directive_id_monetary_directives_id_fk" FOREIGN KEY ("directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reviews" ADD CONSTRAINT "bank_reviews_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "central_banks" ADD CONSTRAINT "central_banks_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "central_banks" ADD CONSTRAINT "central_banks_establishment_directive_id_monetary_directives_id_fk" FOREIGN KEY ("establishment_directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "central_banks" ADD CONSTRAINT "central_banks_charter_directive_id_monetary_directives_id_fk" FOREIGN KEY ("charter_directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_bank_id_central_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."central_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_directive_id_monetary_directives_id_fk" FOREIGN KEY ("directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_directive_id_monetary_directives_id_fk" FOREIGN KEY ("directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_policy_revision_id_monetary_policy_revisions_id_fk" FOREIGN KEY ("policy_revision_id") REFERENCES "public"."monetary_policy_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monetary_approvals" ADD CONSTRAINT "monetary_approvals_directive_id_monetary_directives_id_fk" FOREIGN KEY ("directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monetary_approvals" ADD CONSTRAINT "monetary_approvals_office_id_state_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."state_offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monetary_approvals" ADD CONSTRAINT "monetary_approvals_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monetary_directives" ADD CONSTRAINT "monetary_directives_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monetary_directives" ADD CONSTRAINT "monetary_directives_governance_revision_id_state_governance_revisions_id_fk" FOREIGN KEY ("governance_revision_id") REFERENCES "public"."state_governance_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monetary_directives" ADD CONSTRAINT "monetary_directives_name_text_id_localized_texts_id_fk" FOREIGN KEY ("name_text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monetary_directives" ADD CONSTRAINT "monetary_directives_description_text_id_localized_texts_id_fk" FOREIGN KEY ("description_text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monetary_directives" ADD CONSTRAINT "monetary_directives_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monetary_policy_revisions" ADD CONSTRAINT "monetary_policy_revisions_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monetary_policy_revisions" ADD CONSTRAINT "monetary_policy_revisions_directive_id_monetary_directives_id_fk" FOREIGN KEY ("directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monetary_votes" ADD CONSTRAINT "monetary_votes_directive_id_monetary_directives_id_fk" FOREIGN KEY ("directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monetary_votes" ADD CONSTRAINT "monetary_votes_voting_id_votings_id_fk" FOREIGN KEY ("voting_id") REFERENCES "public"."votings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "financial_account_owner" ON "financial_accounts" USING btree ("currency_id","kind","owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_account_currency" ON "financial_accounts" USING btree ("id","currency_id");--> statement-breakpoint
CREATE INDEX "ledger_posting_account" ON "ledger_postings" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_idempotency" ON "ledger_transactions" USING btree ("actor_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_transaction_currency" ON "ledger_transactions" USING btree ("id","currency_id");--> statement-breakpoint
CREATE INDEX "ledger_currency_time" ON "ledger_transactions" USING btree ("currency_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "monetary_directive_key" ON "monetary_directives" USING btree ("created_by","idempotency_key");--> statement-breakpoint
CREATE INDEX "monetary_directive_state" ON "monetary_directives" USING btree ("state_id","created_at");--> statement-breakpoint
CREATE INDEX "monetary_policy_currency" ON "monetary_policy_revisions" USING btree ("currency_id","created_at");--> statement-breakpoint
-- Financial history is append-only; payloads cannot change after submission.
CREATE FUNCTION protect_monetary_directive() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Monetary history is immutable'; END IF;
  IF (to_jsonb(NEW) - 'status' - 'applied_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'applied_at') THEN
    RAISE EXCEPTION 'Monetary directive payload is immutable';
  END IF;
  IF OLD.status <> 'PENDING' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Completed monetary directive is immutable'; END IF;
  IF (NEW.status = 'APPLIED') <> (NEW.applied_at IS NOT NULL) THEN RAISE EXCEPTION 'Applied directive requires timestamp'; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER monetary_directive_history BEFORE UPDATE OR DELETE ON monetary_directives FOR EACH ROW EXECUTE FUNCTION protect_monetary_directive();
--> statement-breakpoint
CREATE TRIGGER monetary_policy_history BEFORE UPDATE OR DELETE ON monetary_policy_revisions FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER bank_review_history BEFORE UPDATE OR DELETE ON bank_reviews FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER monetary_vote_history BEFORE UPDATE OR DELETE ON monetary_votes FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER ledger_transaction_history BEFORE UPDATE OR DELETE ON ledger_transactions FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER ledger_posting_history BEFORE UPDATE OR DELETE ON ledger_postings FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
ALTER TABLE ledger_postings ADD CONSTRAINT posting_account_currency FOREIGN KEY (account_id, currency_id) REFERENCES financial_accounts(id, currency_id);
--> statement-breakpoint
ALTER TABLE ledger_postings ADD CONSTRAINT posting_transaction_currency FOREIGN KEY (transaction_id, currency_id) REFERENCES ledger_transactions(id, currency_id);
--> statement-breakpoint
ALTER TABLE monetary_directives ADD CONSTRAINT directive_policy_revision FOREIGN KEY (policy_revision_id) REFERENCES monetary_policy_revisions(id);
--> statement-breakpoint
CREATE FUNCTION post_monetary_entry() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE journal ledger_transactions;
BEGIN
  SELECT * INTO STRICT journal FROM ledger_transactions WHERE id = NEW.transaction_id;
  IF journal.database_transaction <> pg_current_xact_id()::text THEN
    RAISE EXCEPTION 'Cannot append postings to a committed transaction';
  END IF;
  UPDATE financial_accounts SET balance_minor = balance_minor + NEW.delta_minor WHERE id = NEW.account_id;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER ledger_apply_posting BEFORE INSERT ON ledger_postings FOR EACH ROW EXECUTE FUNCTION post_monetary_entry();
--> statement-breakpoint
CREATE FUNCTION verify_monetary_journal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE journal ledger_transactions; posting_count integer; posting_sum numeric; posting_max numeric;
        debit_kind text; credit_kind text;
BEGIN
  SELECT * INTO STRICT journal FROM ledger_transactions WHERE id = NEW.id;
  SELECT count(*), sum(delta_minor), max(abs(delta_minor)) INTO posting_count, posting_sum, posting_max
    FROM ledger_postings WHERE transaction_id = journal.id;
  IF posting_count <> 2 OR posting_sum <> 0 OR posting_max <> journal.amount_minor THEN
    RAISE EXCEPTION 'Ledger transaction must have two equal balanced postings';
  END IF;
  SELECT a.kind INTO debit_kind FROM ledger_postings p JOIN financial_accounts a ON a.id = p.account_id WHERE p.transaction_id = journal.id AND p.delta_minor < 0;
  SELECT a.kind INTO credit_kind FROM ledger_postings p JOIN financial_accounts a ON a.id = p.account_id WHERE p.transaction_id = journal.id AND p.delta_minor > 0;
  IF (journal.kind = 'ISSUE' AND (debit_kind <> 'ISSUANCE' OR credit_kind <> 'CENTRAL_BANK' OR journal.policy_revision_id IS NULL OR journal.directive_id IS NULL)) OR
     (journal.kind = 'BURN' AND (debit_kind <> 'CENTRAL_BANK' OR credit_kind <> 'ISSUANCE' OR journal.directive_id IS NULL)) OR
     (journal.kind = 'TRANSFER' AND (debit_kind = 'ISSUANCE' OR credit_kind = 'ISSUANCE')) THEN
    RAISE EXCEPTION 'Invalid monetary source or destination';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER ledger_verify_journal AFTER INSERT ON ledger_transactions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_monetary_journal();
--> statement-breakpoint
CREATE FUNCTION verify_monetary_balance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual numeric; expected numeric;
BEGIN
  SELECT balance_minor INTO actual FROM financial_accounts WHERE id = NEW.id;
  SELECT coalesce(sum(delta_minor), 0) INTO expected FROM ledger_postings WHERE account_id = NEW.id;
  IF actual <> expected THEN RAISE EXCEPTION 'Account balance must agree with immutable postings'; END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER financial_balance_check AFTER INSERT OR UPDATE ON financial_accounts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_monetary_balance();
--> statement-breakpoint
CREATE FUNCTION verify_monetary_supply() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE supply numeric; ordinary numeric; issuance numeric;
BEGIN
  SELECT supply_minor INTO supply FROM currencies WHERE id = NEW.id;
  SELECT coalesce(sum(balance_minor) FILTER (WHERE kind <> 'ISSUANCE'), 0), coalesce(sum(balance_minor) FILTER (WHERE kind = 'ISSUANCE'), 0)
    INTO ordinary, issuance FROM financial_accounts WHERE currency_id = NEW.id;
  IF supply <> ordinary OR supply <> -issuance THEN RAISE EXCEPTION 'Supply must agree with ordinary and issuance accounts'; END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER currency_supply_check AFTER INSERT OR UPDATE ON currencies DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_monetary_supply();
--> statement-breakpoint
CREATE FUNCTION protect_monetary_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Financial identities cannot be deleted'; END IF;
  IF TG_TABLE_NAME = 'financial_accounts' THEN
    IF (to_jsonb(NEW) - 'balance_minor') IS DISTINCT FROM (to_jsonb(OLD) - 'balance_minor') THEN RAISE EXCEPTION 'Account identity is immutable'; END IF;
  ELSIF TG_TABLE_NAME = 'currencies' THEN
    IF (to_jsonb(NEW) - 'supply_minor' - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'supply_minor' - 'status') THEN RAISE EXCEPTION 'Currency identity is immutable'; END IF;
  ELSE
    IF ROW(NEW.id, NEW.state_id, NEW.created_at) IS DISTINCT FROM ROW(OLD.id, OLD.state_id, OLD.created_at) THEN RAISE EXCEPTION 'Bank identity is immutable'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER financial_account_identity BEFORE UPDATE OR DELETE ON financial_accounts FOR EACH ROW EXECUTE FUNCTION protect_monetary_identity();
--> statement-breakpoint
CREATE TRIGGER currency_identity BEFORE UPDATE OR DELETE ON currencies FOR EACH ROW EXECUTE FUNCTION protect_monetary_identity();
--> statement-breakpoint
CREATE TRIGGER central_bank_identity BEFORE UPDATE OR DELETE ON central_banks FOR EACH ROW EXECUTE FUNCTION protect_monetary_identity();
