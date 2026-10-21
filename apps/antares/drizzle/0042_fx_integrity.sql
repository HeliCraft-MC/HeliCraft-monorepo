-- Finite reservations are immutable offer obligations on official bank balances.
-- Expiry releases their unused amount at the pre-approved deadline, even before a status sweep.
CREATE FUNCTION bank_reserved_minor(bank_id uuid, currency_id uuid) RETURNS numeric LANGUAGE sql VOLATILE AS $$
  SELECT coalesce(sum(o.remaining_lots * o.provide_per_lot_minor),0)
  FROM fx_offers o WHERE o.bank_id = $1 AND o.provide_currency_id = $2 AND o.status = 'ACTIVE' AND o.expires_at > clock_timestamp();
$$;
--> statement-breakpoint
CREATE FUNCTION check_fx_bank_reserve() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE account financial_accounts;
BEGIN
  SELECT * INTO STRICT account FROM financial_accounts WHERE id = NEW.account_id;
  IF account.kind = 'CENTRAL_BANK' AND account.balance_minor < bank_reserved_minor(account.owner_id,account.currency_id) THEN
    RAISE EXCEPTION 'An official payment cannot spend the reserve of an unexpired currency offer';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER fx_bank_reserve_after_posting AFTER INSERT ON ledger_postings FOR EACH ROW EXECUTE FUNCTION check_fx_bank_reserve();
--> statement-breakpoint
CREATE FUNCTION assert_fx_offer_terms(terms jsonb) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF (jsonb_typeof(terms) = 'object' AND terms->>'receiveCurrencyId' <> terms->>'provideCurrencyId' AND
      terms->>'receivePerLotMinor' ~ '^[1-9][0-9]{0,29}$' AND terms->>'providePerLotMinor' ~ '^[1-9][0-9]{0,29}$' AND
      terms->>'totalLots' ~ '^[1-9][0-9]{0,29}$' AND terms->>'minimumLots' ~ '^[1-9][0-9]{0,29}$' AND
      (terms->>'minimumLots')::numeric <= (terms->>'totalLots')::numeric AND
      (terms->>'receivePerLotMinor')::numeric * (terms->>'totalLots')::numeric < 1000000000000000000000000000000 AND
      (terms->>'providePerLotMinor')::numeric * (terms->>'totalLots')::numeric < 1000000000000000000000000000000) IS NOT TRUE THEN
    RAISE EXCEPTION 'FX offers require exact positive bounded integer lots and two different currencies';
  END IF;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION guard_fx_offer() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source monetary_directives; bank central_banks;
BEGIN
  PERFORM pg_advisory_xact_lock(741022);
  PERFORM 1 FROM financial_accounts WHERE kind = 'CENTRAL_BANK' AND owner_id = NEW.bank_id AND currency_id = NEW.provide_currency_id FOR UPDATE;
  IF TG_OP = 'INSERT' THEN
    PERFORM assert_fx_offer_terms(NEW.terms);
    SELECT * INTO STRICT source FROM monetary_directives WHERE id = NEW.publish_directive_id;
    SELECT * INTO STRICT bank FROM central_banks WHERE id = NEW.bank_id AND state_id = NEW.state_id;
    IF source.status <> 'PENDING' OR source.state_id <> NEW.state_id OR source.payload->>'kind' IS DISTINCT FROM 'PUBLISH_FX_OFFER' OR
       source.payload->>'offerId' IS DISTINCT FROM NEW.id::text OR source.payload->'terms' IS DISTINCT FROM NEW.terms OR
       NEW.terms->>'receiveCurrencyId' IS DISTINCT FROM NEW.receive_currency_id::text OR NEW.terms->>'provideCurrencyId' IS DISTINCT FROM NEW.provide_currency_id::text OR
       (NEW.terms->>'providePerLotMinor')::numeric IS DISTINCT FROM NEW.provide_per_lot_minor OR
       (NEW.terms->>'totalLots')::numeric IS DISTINCT FROM NEW.remaining_lots OR
       (NEW.terms->>'expiresAt')::timestamptz IS DISTINCT FROM NEW.expires_at OR NEW.expires_at <= clock_timestamp() OR NEW.status <> 'ACTIVE' OR bank.status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'A new FX reserve must bind its exact executing state decision, bank, currencies and finite immutable terms';
    END IF;
    NEW.created_at := clock_timestamp();
  ELSE
    IF (NEW.id,NEW.state_id,NEW.bank_id,NEW.publish_directive_id,NEW.terms,NEW.terms_hash,NEW.receive_currency_id,NEW.provide_currency_id,NEW.provide_per_lot_minor,NEW.expires_at,NEW.created_at) IS DISTINCT FROM
       (OLD.id,OLD.state_id,OLD.bank_id,OLD.publish_directive_id,OLD.terms,OLD.terms_hash,OLD.receive_currency_id,OLD.provide_currency_id,OLD.provide_per_lot_minor,OLD.expires_at,OLD.created_at) OR
       OLD.status <> 'ACTIVE' OR NEW.remaining_lots > OLD.remaining_lots OR
       (NEW.status IN ('CANCELLED','EXPIRED') AND NEW.remaining_lots <> OLD.remaining_lots) OR
       (NEW.status = 'ACTIVE' AND (NEW.remaining_lots <= 0 OR NEW.remaining_lots >= OLD.remaining_lots)) OR
       (NEW.status = 'FILLED' AND NEW.remaining_lots <> 0) OR
       (NEW.expires_at <= clock_timestamp() AND NEW.status IN ('ACTIVE','FILLED')) THEN
      RAISE EXCEPTION 'Offer terms and completed history are immutable; fills only reduce an active unexpired reserve';
    END IF;
  END IF;
  NEW.database_transaction := pg_current_xact_id()::text;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER fx_offer_guard BEFORE INSERT OR UPDATE ON fx_offers FOR EACH ROW EXECUTE FUNCTION guard_fx_offer();
--> statement-breakpoint
CREATE TRIGGER fx_offer_no_delete BEFORE DELETE ON fx_offers FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE FUNCTION guard_fx_offer_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE offer fx_offers;
BEGIN
  SELECT * INTO STRICT offer FROM fx_offers WHERE id = NEW.offer_id;
  IF offer.database_transaction <> pg_current_xact_id()::text OR NEW.remaining_after <> offer.remaining_lots THEN
    RAISE EXCEPTION 'A reservation event must accompany its actual atomic offer transition';
  END IF;
  NEW.database_transaction := pg_current_xact_id()::text;
  NEW.created_at := clock_timestamp();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER fx_offer_event_guard BEFORE INSERT ON fx_offer_events FOR EACH ROW EXECUTE FUNCTION guard_fx_offer_event();
--> statement-breakpoint
CREATE TRIGGER fx_offer_event_history BEFORE UPDATE OR DELETE ON fx_offer_events FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE FUNCTION verify_fx_offer_transition() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event fx_offer_events; source monetary_directives; exchange fx_exchanges; quote fx_quotes; balance numeric;
BEGIN
  SELECT * INTO STRICT event FROM fx_offer_events WHERE offer_id = NEW.id AND database_transaction = NEW.database_transaction;
  IF event.remaining_after <> NEW.remaining_lots OR
     (TG_OP = 'INSERT' AND (event.kind <> 'PUBLISH' OR event.remaining_before <> 0 OR event.directive_id IS DISTINCT FROM NEW.publish_directive_id)) OR
     (TG_OP = 'UPDATE' AND event.remaining_before <> OLD.remaining_lots) THEN RAISE EXCEPTION 'Every reserve transition requires its exact immutable before/after event'; END IF;
  IF event.kind IN ('PUBLISH','CANCEL') THEN
    SELECT * INTO STRICT source FROM monetary_directives WHERE id = event.directive_id;
    IF source.status <> 'APPLIED' OR source.state_id <> NEW.state_id OR event.exchange_id IS NOT NULL OR event.actor_id IS NULL OR
       NOT EXISTS (SELECT 1 FROM admin_audit_log WHERE target_id = source.id AND action = 'monetary.directive.applied' AND actor_id = event.actor_id) THEN
      RAISE EXCEPTION 'Publication and cancellation retain their actual completed state decision and executor';
    END IF;
    IF event.kind = 'PUBLISH' AND (source.payload->>'kind' IS DISTINCT FROM 'PUBLISH_FX_OFFER' OR source.payload->'terms' IS DISTINCT FROM NEW.terms OR NEW.status <> 'ACTIVE') THEN RAISE EXCEPTION 'Publication terms mismatch'; END IF;
    IF event.kind = 'CANCEL' AND (source.payload->>'kind' IS DISTINCT FROM 'CANCEL_FX_OFFER' OR source.payload->>'offerId' IS DISTINCT FROM NEW.id::text OR source.payload->>'termsHash' IS DISTINCT FROM NEW.terms_hash OR NEW.status <> 'CANCELLED') THEN RAISE EXCEPTION 'Cancellation scope mismatch'; END IF;
  ELSIF event.kind = 'EXPIRE' THEN
    IF NEW.status <> 'EXPIRED' OR NEW.expires_at > clock_timestamp() OR event.directive_id IS NOT NULL OR event.exchange_id IS NOT NULL THEN RAISE EXCEPTION 'Only the pre-approved deadline releases an expired reservation'; END IF;
  ELSE
    SELECT * INTO STRICT exchange FROM fx_exchanges WHERE id = event.exchange_id AND offer_id = NEW.id;
    SELECT * INTO STRICT quote FROM fx_quotes WHERE id = exchange.quote_id;
    IF event.actor_id IS DISTINCT FROM exchange.actor_id OR event.directive_id IS NOT NULL OR
       event.remaining_before - event.remaining_after <> quote.lots OR NEW.status NOT IN ('ACTIVE','FILLED') THEN RAISE EXCEPTION 'Fill history must consume the exact consented integer lots'; END IF;
  END IF;
  SELECT balance_minor INTO balance FROM financial_accounts WHERE kind = 'CENTRAL_BANK' AND owner_id = NEW.bank_id AND currency_id = NEW.provide_currency_id;
  IF coalesce(balance,0) < bank_reserved_minor(NEW.bank_id,NEW.provide_currency_id) THEN RAISE EXCEPTION 'Published offers cannot over-reserve an official balance'; END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER fx_offer_transition_complete AFTER INSERT OR UPDATE ON fx_offers DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_fx_offer_transition();
--> statement-breakpoint
CREATE FUNCTION guard_fx_quote() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE offer fx_offers;
BEGIN
  SELECT * INTO STRICT offer FROM fx_offers WHERE id = NEW.offer_id;
  NEW.created_at := clock_timestamp();
  IF offer.status <> 'ACTIVE' OR offer.expires_at <= NEW.created_at OR NEW.expires_at <= NEW.created_at OR NEW.expires_at > offer.expires_at OR
     NEW.terms_hash <> offer.terms_hash OR NEW.lots < (offer.terms->>'minimumLots')::numeric OR NEW.lots > offer.remaining_lots OR
     NEW.receive_minor <> NEW.lots * (offer.terms->>'receivePerLotMinor')::numeric OR NEW.provide_minor <> NEW.lots * offer.provide_per_lot_minor THEN
    RAISE EXCEPTION 'FX quotes must bind the actual unexpired offer and its exact bounded lot calculation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER fx_quote_guard BEFORE INSERT ON fx_quotes FOR EACH ROW EXECUTE FUNCTION guard_fx_quote();
--> statement-breakpoint
CREATE TRIGGER fx_quote_history BEFORE UPDATE OR DELETE ON fx_quotes FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE FUNCTION guard_fx_trade() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(741022);
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'PENDING' OR NEW.terms->'first'->>'stateId' IS DISTINCT FROM NEW.first_state_id::text OR NEW.terms->'second'->>'stateId' IS DISTINCT FROM NEW.second_state_id::text OR
       NEW.terms->'first'->>'bankId' IS NOT DISTINCT FROM NEW.terms->'second'->>'bankId' OR NEW.terms->'first'->>'currencyId' IS NOT DISTINCT FROM NEW.terms->'second'->>'currencyId' OR
       (NEW.terms->'first'->>'amountMinor' ~ '^[1-9][0-9]{0,29}$') IS NOT TRUE OR (NEW.terms->'second'->>'amountMinor' ~ '^[1-9][0-9]{0,29}$') IS NOT TRUE OR
       (NEW.terms->>'expiresAt')::timestamptz <= clock_timestamp() THEN RAISE EXCEPTION 'An interbank trade requires exact finite positive two-currency terms and different real banks'; END IF;
    NEW.created_at := clock_timestamp();
  ELSIF (NEW.id,NEW.terms,NEW.terms_hash,NEW.first_state_id,NEW.second_state_id,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.terms,OLD.terms_hash,OLD.first_state_id,OLD.second_state_id,OLD.created_at) OR OLD.status <> 'PENDING' OR NEW.status <> 'SETTLED' THEN
    RAISE EXCEPTION 'Interbank terms are immutable and settle only once';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER fx_trade_guard BEFORE INSERT OR UPDATE ON fx_interbank_trades FOR EACH ROW EXECUTE FUNCTION guard_fx_trade();
--> statement-breakpoint
CREATE TRIGGER fx_trade_no_delete BEFORE DELETE ON fx_interbank_trades FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE FUNCTION guard_fx_interbank_approval() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source monetary_directives; trade fx_interbank_trades;
BEGIN
  SELECT * INTO STRICT source FROM monetary_directives WHERE id = NEW.directive_id;
  SELECT * INTO STRICT trade FROM fx_interbank_trades WHERE id = NEW.trade_id;
  IF source.status <> 'PENDING' OR source.state_id <> NEW.state_id OR NEW.state_id NOT IN (trade.first_state_id,trade.second_state_id) OR
     source.payload->>'kind' IS DISTINCT FROM 'APPROVE_INTERBANK_EXCHANGE' OR source.payload->>'tradeId' IS DISTINCT FROM trade.id::text OR source.payload->'terms' IS DISTINCT FROM trade.terms THEN
    RAISE EXCEPTION 'Interbank consent must come from its actual executing party decision and exact immutable terms';
  END IF;
  NEW.created_at := clock_timestamp(); NEW.database_transaction := pg_current_xact_id()::text;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER fx_interbank_approval_guard BEFORE INSERT ON fx_interbank_approvals FOR EACH ROW EXECUTE FUNCTION guard_fx_interbank_approval();
--> statement-breakpoint
CREATE TRIGGER fx_interbank_approval_history BEFORE UPDATE OR DELETE ON fx_interbank_approvals FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE FUNCTION verify_fx_interbank_approval() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM monetary_directives d JOIN admin_audit_log a ON a.target_id = d.id AND a.action = 'monetary.directive.applied' AND a.actor_id = NEW.actor_id WHERE d.id = NEW.directive_id AND d.status = 'APPLIED') THEN
    RAISE EXCEPTION 'Interbank consent retains the completed state decision and its real executor';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER fx_interbank_approval_complete AFTER INSERT ON fx_interbank_approvals DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_fx_interbank_approval();
--> statement-breakpoint
CREATE FUNCTION verify_fx_trade() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE trade fx_interbank_trades;
BEGIN
  SELECT * INTO STRICT trade FROM fx_interbank_trades WHERE id = NEW.id;
  IF NOT EXISTS (SELECT 1 FROM fx_interbank_approvals WHERE trade_id = trade.id) OR
     (trade.status = 'SETTLED') IS DISTINCT FROM (EXISTS (SELECT 1 FROM fx_exchanges WHERE trade_id = trade.id)) THEN
    RAISE EXCEPTION 'Interbank history requires real consent and exactly its atomic settlement outcome';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER fx_trade_complete AFTER INSERT OR UPDATE ON fx_interbank_trades DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_fx_trade();
--> statement-breakpoint
CREATE FUNCTION guard_fx_exchange() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.created_at := clock_timestamp(); NEW.database_transaction := pg_current_xact_id()::text;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER fx_exchange_guard BEFORE INSERT ON fx_exchanges FOR EACH ROW EXECUTE FUNCTION guard_fx_exchange();
--> statement-breakpoint
CREATE TRIGGER fx_exchange_history BEFORE UPDATE OR DELETE ON fx_exchanges FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE FUNCTION guard_fx_journal_link() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM fx_exchanges x JOIN ledger_transactions j ON j.id = NEW.journal_id WHERE x.id = NEW.exchange_id AND x.database_transaction = pg_current_xact_id()::text AND j.database_transaction = x.database_transaction) THEN
    RAISE EXCEPTION 'FX journals must be created inside their exact atomic exchange';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER fx_journal_link_guard BEFORE INSERT ON fx_exchange_journals FOR EACH ROW EXECUTE FUNCTION guard_fx_journal_link();
--> statement-breakpoint
CREATE TRIGGER fx_journal_link_history BEFORE UPDATE OR DELETE ON fx_exchange_journals FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE FUNCTION verify_fx_exchange() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE exchange fx_exchanges; offer fx_offers; quote fx_quotes; trade fx_interbank_trades; first_consent fx_interbank_approvals; second_consent fx_interbank_approvals;
        receive_from uuid; receive_to uuid; provide_from uuid; provide_to uuid; receive_kind text; provide_kind text; link fx_exchange_journals; journal ledger_transactions; debit financial_accounts; credit financial_accounts;
BEGIN
  SELECT * INTO STRICT exchange FROM fx_exchanges WHERE id = NEW.id;
  IF exchange.offer_id IS NOT NULL THEN
    SELECT * INTO STRICT offer FROM fx_offers WHERE id = exchange.offer_id;
    SELECT * INTO STRICT quote FROM fx_quotes WHERE id = exchange.quote_id;
    IF quote.actor_id <> exchange.actor_id OR quote.offer_id <> offer.id OR quote.terms_hash <> offer.terms_hash OR quote.expires_at <= clock_timestamp() OR quote.created_at > exchange.created_at OR offer.expires_at <= clock_timestamp() OR
       exchange.receive_currency_id <> offer.receive_currency_id OR exchange.provide_currency_id <> offer.provide_currency_id OR exchange.receive_minor <> quote.receive_minor OR exchange.provide_minor <> quote.provide_minor OR
       exchange.first_approval_id IS NOT NULL OR exchange.second_approval_id IS NOT NULL OR
       NOT EXISTS (SELECT 1 FROM fx_offer_events WHERE exchange_id = exchange.id AND kind = 'FILL' AND actor_id = exchange.actor_id) THEN RAISE EXCEPTION 'Client FX settlement must consume its exact immutable quote and real reserved offer'; END IF;
    IF NOT EXISTS (SELECT 1 FROM central_banks b JOIN states s ON s.id = b.state_id WHERE b.id = offer.bank_id AND b.state_id = offer.state_id AND b.status = 'ACTIVE' AND s.status = 'ACTIVE') THEN RAISE EXCEPTION 'Client exchange requires a currently active bank and state'; END IF;
    receive_from := exchange.actor_id; receive_to := offer.bank_id; provide_from := offer.bank_id; provide_to := exchange.actor_id; receive_kind := 'PLAYER'; provide_kind := 'PLAYER';
  ELSE
    SELECT * INTO STRICT trade FROM fx_interbank_trades WHERE id = exchange.trade_id;
    SELECT * INTO STRICT first_consent FROM fx_interbank_approvals WHERE directive_id = exchange.first_approval_id AND trade_id = trade.id AND state_id = trade.first_state_id;
    SELECT * INTO STRICT second_consent FROM fx_interbank_approvals WHERE directive_id = exchange.second_approval_id AND trade_id = trade.id AND state_id = trade.second_state_id;
    IF trade.status <> 'SETTLED' OR (trade.terms->>'expiresAt')::timestamptz <= clock_timestamp() OR
       exchange.receive_currency_id::text IS DISTINCT FROM trade.terms->'first'->>'currencyId' OR exchange.provide_currency_id::text IS DISTINCT FROM trade.terms->'second'->>'currencyId' OR
       exchange.receive_minor IS DISTINCT FROM (trade.terms->'first'->>'amountMinor')::numeric OR exchange.provide_minor IS DISTINCT FROM (trade.terms->'second'->>'amountMinor')::numeric OR
       NOT ((first_consent.database_transaction = exchange.database_transaction AND first_consent.actor_id = exchange.actor_id) OR (second_consent.database_transaction = exchange.database_transaction AND second_consent.actor_id = exchange.actor_id)) OR
       (SELECT count(*) FROM monetary_directives d JOIN states s ON s.id = d.state_id WHERE d.id IN (first_consent.directive_id,second_consent.directive_id) AND d.status = 'APPLIED' AND s.status = 'ACTIVE' AND s.current_revision_id = d.governance_revision_id) <> 2 THEN
      RAISE EXCEPTION 'Interbank settlement must pin both actual completed current Governance decisions and the executing party';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM central_banks WHERE id = (trade.terms->'first'->>'bankId')::uuid AND state_id = trade.first_state_id AND status = 'ACTIVE') OR
       NOT EXISTS (SELECT 1 FROM central_banks WHERE id = (trade.terms->'second'->>'bankId')::uuid AND state_id = trade.second_state_id AND status = 'ACTIVE') THEN RAISE EXCEPTION 'Interbank legal parties must bind the actual active official banks'; END IF;
    receive_from := (trade.terms->'first'->>'bankId')::uuid; receive_to := (trade.terms->'second'->>'bankId')::uuid;
    provide_from := receive_to; provide_to := receive_from; receive_kind := 'CENTRAL_BANK'; provide_kind := 'CENTRAL_BANK';
  END IF;
  IF (SELECT count(*) FROM fx_exchange_journals WHERE exchange_id = exchange.id) <> 2 OR
     (SELECT count(*) FROM currencies WHERE id IN (exchange.receive_currency_id,exchange.provide_currency_id) AND status = 'ACTIVE') <> 2 THEN RAISE EXCEPTION 'FX requires exactly two real active currencies and two complete journals'; END IF;
  FOR link IN SELECT * FROM fx_exchange_journals WHERE exchange_id = exchange.id LOOP
    SELECT * INTO STRICT journal FROM ledger_transactions WHERE id = link.journal_id;
    SELECT a.* INTO STRICT debit FROM ledger_postings p JOIN financial_accounts a ON a.id = p.account_id WHERE p.transaction_id = journal.id AND p.delta_minor < 0;
    SELECT a.* INTO STRICT credit FROM ledger_postings p JOIN financial_accounts a ON a.id = p.account_id WHERE p.transaction_id = journal.id AND p.delta_minor > 0;
    IF journal.kind <> 'TRANSFER' OR journal.actor_id <> exchange.actor_id OR journal.payload_hash <> exchange.command_hash OR journal.directive_id IS NOT NULL OR journal.company_decision_id IS NOT NULL OR journal.policy_revision_id IS NOT NULL OR
       EXISTS (SELECT 1 FROM economic_journals WHERE journal_id = journal.id) THEN RAISE EXCEPTION 'FX is a separate typed two-currency event and cannot mint, burn or impersonate an ordinary taxable transfer'; END IF;
    IF link.leg = 'RECEIVE' THEN
      IF journal.currency_id <> exchange.receive_currency_id OR journal.amount_minor <> exchange.receive_minor OR debit.kind <> receive_kind OR debit.owner_id <> receive_from OR credit.kind <> 'CENTRAL_BANK' OR credit.owner_id <> receive_to THEN RAISE EXCEPTION 'First FX journal must fund the exact approved counterparty and currency'; END IF;
    ELSIF journal.currency_id <> exchange.provide_currency_id OR journal.amount_minor <> exchange.provide_minor OR debit.kind <> 'CENTRAL_BANK' OR debit.owner_id <> provide_from OR credit.kind <> provide_kind OR credit.owner_id <> provide_to THEN RAISE EXCEPTION 'Second FX journal must deliver the exact reciprocal currency without one-sided settlement'; END IF;
  END LOOP;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER fx_exchange_complete AFTER INSERT ON fx_exchanges DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_fx_exchange();

--> statement-breakpoint
CREATE FUNCTION verify_official_financial_source() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE journal ledger_transactions; source monetary_directives; issuer currencies; bank central_banks; debit financial_accounts; credit financial_accounts;
BEGIN
  SELECT * INTO STRICT journal FROM ledger_transactions WHERE id = NEW.id;
  IF journal.directive_id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO STRICT source FROM monetary_directives WHERE id = journal.directive_id;
  SELECT * INTO STRICT issuer FROM currencies WHERE id = journal.currency_id;
  SELECT * INTO STRICT bank FROM central_banks WHERE state_id = source.state_id;
  SELECT a.* INTO STRICT debit FROM ledger_postings p JOIN financial_accounts a ON a.id = p.account_id WHERE p.transaction_id = journal.id AND p.delta_minor < 0;
  SELECT a.* INTO STRICT credit FROM ledger_postings p JOIN financial_accounts a ON a.id = p.account_id WHERE p.transaction_id = journal.id AND p.delta_minor > 0;
  IF source.status <> 'APPLIED' OR source.payload->>'currencyId' IS DISTINCT FROM journal.currency_id::text OR
     (source.payload->>'amountMinor')::numeric IS DISTINCT FROM journal.amount_minor OR source.payload->>'purpose' IS DISTINCT FROM journal.purpose OR journal.idempotency_key <> source.id OR
     bank.status <> 'ACTIVE' OR issuer.status <> 'ACTIVE' THEN RAISE EXCEPTION 'Official journals require their actual completed bank/state command and exact terms'; END IF;
  IF journal.kind IN ('ISSUE','BURN') THEN
    IF source.state_id <> issuer.state_id OR bank.id <> issuer.bank_id OR source.payload->>'kind' IS DISTINCT FROM journal.kind OR
       (journal.kind = 'ISSUE' AND (debit.kind <> 'ISSUANCE' OR debit.owner_id <> issuer.id OR credit.kind <> 'CENTRAL_BANK' OR credit.owner_id <> issuer.bank_id)) OR
       (journal.kind = 'BURN' AND (debit.kind <> 'CENTRAL_BANK' OR debit.owner_id <> issuer.bank_id OR credit.kind <> 'ISSUANCE' OR credit.owner_id <> issuer.id)) THEN RAISE EXCEPTION 'Only the national issuing bank can issue or burn its own currency'; END IF;
  ELSE
    IF (source.payload->>'kind' IN ('BANK_TRANSFER','TREASURY_TRANSFER')) IS NOT TRUE OR
       (source.payload->>'kind' = 'BANK_TRANSFER' AND (debit.kind <> 'CENTRAL_BANK' OR debit.owner_id <> bank.id)) OR
       (source.payload->>'kind' = 'TREASURY_TRANSFER' AND (debit.kind <> 'TREASURY' OR debit.owner_id <> source.state_id)) THEN RAISE EXCEPTION 'Foreign currency holdings belong to the authorizing state bank or treasury, never to the currency issuer by implication'; END IF;
    IF (source.payload->'recipient'->>'type' = 'PLAYER' AND (credit.kind <> 'PLAYER' OR credit.owner_id::text IS DISTINCT FROM source.payload->'recipient'->>'userId')) OR
       (source.payload->'recipient'->>'type' = 'COMPANY' AND (credit.kind <> 'COMPANY' OR credit.owner_id::text IS DISTINCT FROM source.payload->'recipient'->>'companyId')) OR
       (source.payload->'recipient'->>'type' = 'TREASURY' AND (credit.kind <> 'TREASURY' OR credit.owner_id <> source.state_id)) OR
       (source.payload->'recipient'->>'type' = 'CENTRAL_BANK' AND (credit.kind <> 'CENTRAL_BANK' OR credit.owner_id <> bank.id)) OR
       (source.payload->'recipient'->>'type' IN ('PLAYER','COMPANY','TREASURY','CENTRAL_BANK')) IS NOT TRUE THEN RAISE EXCEPTION 'The official recipient must match the exact actual legal owner in its approved command'; END IF;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER official_financial_source_complete AFTER INSERT ON ledger_transactions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_official_financial_source();

--> statement-breakpoint
CREATE OR REPLACE FUNCTION verify_company_financial_journal() RETURNS trigger LANGUAGE plpgsql AS $$
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
  IF EXISTS (SELECT 1 FROM economic_journals e JOIN economic_operations op ON op.id = e.operation_id WHERE e.journal_id = journal.id AND (op.sender_kind = 'COMPANY' OR op.recipient_kind = 'COMPANY')) THEN RETURN NULL; END IF;
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
    IF directive.status <> 'APPLIED' OR (directive.payload->>'kind' IN ('BANK_TRANSFER','TREASURY_TRANSFER')) IS NOT TRUE OR
       directive.payload->>'currencyId' IS DISTINCT FROM journal.currency_id::text OR (directive.payload->>'amountMinor')::numeric IS DISTINCT FROM journal.amount_minor OR
       directive.payload->>'purpose' IS DISTINCT FROM journal.purpose OR journal.idempotency_key <> directive.id OR
       directive.payload->'recipient'->>'type' IS DISTINCT FROM 'COMPANY' OR directive.payload->'recipient'->>'companyId' IS DISTINCT FROM credit.owner_id::text OR
       (directive.payload->>'kind' = 'BANK_TRANSFER' AND (debit.kind <> 'CENTRAL_BANK' OR NOT EXISTS (SELECT 1 FROM central_banks WHERE id = debit.owner_id AND state_id = directive.state_id))) OR
       (directive.payload->>'kind' = 'TREASURY_TRANSFER' AND (debit.kind <> 'TREASURY' OR debit.owner_id <> directive.state_id)) THEN
      RAISE EXCEPTION 'Official company funding requires its exact completed state decision, real source and accepted recipient';
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
