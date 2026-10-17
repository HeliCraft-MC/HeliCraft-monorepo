-- Reconcile every posted journal even if an erroneous writer forgets to update currencies.
-- The check runs at commit, after both postings and the authoritative supply update.
CREATE FUNCTION verify_posted_currency_supply() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE supply numeric; ordinary numeric; issuance numeric;
BEGIN
  SELECT supply_minor INTO STRICT supply FROM currencies WHERE id = NEW.currency_id;
  SELECT coalesce(sum(balance_minor) FILTER (WHERE kind <> 'ISSUANCE'), 0),
         coalesce(sum(balance_minor) FILTER (WHERE kind = 'ISSUANCE'), 0)
    INTO ordinary, issuance FROM financial_accounts WHERE currency_id = NEW.currency_id;
  IF supply <> ordinary OR supply <> -issuance THEN
    RAISE EXCEPTION 'Posted currency supply must agree with all ordinary and issuance accounts';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER ledger_currency_supply_check AFTER INSERT ON ledger_transactions
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_posted_currency_supply();
