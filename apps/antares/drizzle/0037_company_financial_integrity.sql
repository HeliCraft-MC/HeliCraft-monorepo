ALTER TABLE ledger_transactions ADD CONSTRAINT ledger_company_decision_source FOREIGN KEY (company_decision_id) REFERENCES company_decisions(id);
--> statement-breakpoint
CREATE FUNCTION guard_company_financial_account() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.kind = 'COMPANY' AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = NEW.owner_id AND c.status = 'ACTIVE' AND c.founded_at IS NOT NULL AND c.current_revision_id IS NOT NULL) THEN
    RAISE EXCEPTION 'A corporate financial account requires an active registered legal company';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_account_owner_guard BEFORE INSERT ON financial_accounts FOR EACH ROW EXECUTE FUNCTION guard_company_financial_account();
--> statement-breakpoint
CREATE FUNCTION guard_company_financial_posting() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE account financial_accounts;
BEGIN
  SELECT * INTO STRICT account FROM financial_accounts WHERE id = NEW.account_id;
  IF account.kind = 'COMPANY' THEN
    PERFORM 1 FROM companies WHERE id = account.owner_id AND status = 'ACTIVE' AND founded_at IS NOT NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Suspended or unregistered companies cannot send or receive new official money'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_posting_owner_guard BEFORE INSERT ON ledger_postings FOR EACH ROW EXECUTE FUNCTION guard_company_financial_posting();
--> statement-breakpoint
CREATE FUNCTION verify_company_financial_journal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE journal ledger_transactions; debit financial_accounts; credit financial_accounts; issuer currencies; source company_decisions; directive monetary_directives;
BEGIN
  SELECT * INTO STRICT journal FROM ledger_transactions WHERE id = NEW.id;
  SELECT a.* INTO STRICT debit FROM ledger_postings p JOIN financial_accounts a ON a.id = p.account_id WHERE p.transaction_id = journal.id AND p.delta_minor < 0;
  SELECT a.* INTO STRICT credit FROM ledger_postings p JOIN financial_accounts a ON a.id = p.account_id WHERE p.transaction_id = journal.id AND p.delta_minor > 0;
  IF debit.kind <> 'COMPANY' AND credit.kind <> 'COMPANY' THEN
    IF journal.company_decision_id IS NOT NULL THEN RAISE EXCEPTION 'Corporate source evidence cannot authorize a different financial owner'; END IF;
    RETURN NULL;
  END IF;
  IF journal.kind <> 'TRANSFER' THEN RAISE EXCEPTION 'Companies cannot mint or burn currency'; END IF;
  IF debit.kind = 'COMPANY' THEN
    SELECT * INTO STRICT source FROM company_decisions WHERE id = journal.company_decision_id;
    IF journal.directive_id IS NOT NULL OR source.status <> 'APPLIED' OR source.company_id <> debit.owner_id OR source.applied_by IS DISTINCT FROM journal.actor_id OR
       source.revision_id IS DISTINCT FROM (SELECT current_revision_id FROM companies WHERE id = debit.owner_id) OR
       source.payload->>'kind' IS DISTINCT FROM 'TRANSFER_FUNDS' OR source.payload->>'currencyId' IS DISTINCT FROM journal.currency_id::text OR
       (source.payload->>'amountMinor')::numeric IS DISTINCT FROM journal.amount_minor OR source.payload->>'purpose' IS DISTINCT FROM journal.purpose OR
       journal.idempotency_key <> source.id OR source.payload->'recipient'->>'type' IS DISTINCT FROM 'STATE' OR credit.kind <> 'TREASURY' OR
       source.payload->'recipient'->>'id' IS DISTINCT FROM credit.owner_id::text THEN
      RAISE EXCEPTION 'A company treasury payment requires its exact completed corporate Governance decision';
    END IF;
  ELSE
    IF journal.company_decision_id IS NOT NULL OR debit.kind NOT IN ('TREASURY','CENTRAL_BANK') THEN RAISE EXCEPTION 'Taxable company inflows require the forthcoming typed corporate tax event settlement'; END IF;
    SELECT * INTO STRICT directive FROM monetary_directives WHERE id = journal.directive_id;
    SELECT * INTO STRICT issuer FROM currencies WHERE id = journal.currency_id;
    IF directive.status <> 'APPLIED' OR directive.state_id <> issuer.state_id OR (directive.payload->>'kind' IN ('BANK_TRANSFER','TREASURY_TRANSFER')) IS NOT TRUE OR
       directive.payload->>'currencyId' IS DISTINCT FROM journal.currency_id::text OR (directive.payload->>'amountMinor')::numeric IS DISTINCT FROM journal.amount_minor OR
       directive.payload->>'purpose' IS DISTINCT FROM journal.purpose OR journal.idempotency_key <> directive.id OR
       directive.payload->'recipient'->>'type' IS DISTINCT FROM 'COMPANY' OR directive.payload->'recipient'->>'companyId' IS DISTINCT FROM credit.owner_id::text OR
       (directive.payload->>'kind' = 'BANK_TRANSFER' AND (debit.kind <> 'CENTRAL_BANK' OR debit.owner_id <> issuer.bank_id)) OR
       (directive.payload->>'kind' = 'TREASURY_TRANSFER' AND (debit.kind <> 'TREASURY' OR debit.owner_id <> issuer.state_id)) THEN
      RAISE EXCEPTION 'Official company funding requires its exact completed state decision, real source and accepted recipient';
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER company_journal_source_complete AFTER INSERT ON ledger_transactions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_company_financial_journal();
