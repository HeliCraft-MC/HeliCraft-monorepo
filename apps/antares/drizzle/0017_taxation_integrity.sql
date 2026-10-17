-- Revisions and financial evidence are append-only, like the existing monetary history.
CREATE TRIGGER tax_law_identity BEFORE UPDATE OR DELETE ON tax_laws FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER tax_law_revision_history BEFORE UPDATE OR DELETE ON tax_law_revisions FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER tax_office_review_history BEFORE UPDATE OR DELETE ON tax_office_reviews FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER treaty_revision_history BEFORE UPDATE OR DELETE ON treaty_revisions FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER treaty_party_history BEFORE UPDATE OR DELETE ON treaty_parties FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER treaty_decision_history BEFORE UPDATE OR DELETE ON treaty_decisions FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER treaty_activation_history BEFORE UPDATE OR DELETE ON treaty_activations FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER economic_operation_history BEFORE UPDATE OR DELETE ON economic_operations FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER economic_journal_history BEFORE UPDATE OR DELETE ON economic_journals FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER tax_assessment_history BEFORE UPDATE OR DELETE ON tax_assessments FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER tax_claim_history BEFORE UPDATE OR DELETE ON tax_assessment_claims FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER transfer_quote_history BEFORE UPDATE OR DELETE ON transfer_quotes FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
ALTER TABLE economic_operations ADD CONSTRAINT economic_principal_journal FOREIGN KEY (id) REFERENCES ledger_transactions(id);
--> statement-breakpoint
ALTER TABLE treaties ADD CONSTRAINT treaty_current_revision FOREIGN KEY (current_revision_id) REFERENCES treaty_revisions(id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE treaties ADD CONSTRAINT treaty_active_revision FOREIGN KEY (active_revision_id) REFERENCES treaty_revisions(id);
--> statement-breakpoint
CREATE FUNCTION protect_tax_office_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Tax institution history is immutable'; END IF;
  IF ROW(NEW.id, NEW.state_id, NEW.created_at) IS DISTINCT FROM ROW(OLD.id, OLD.state_id, OLD.created_at) THEN
    RAISE EXCEPTION 'Tax institution identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER tax_office_identity BEFORE UPDATE OR DELETE ON tax_offices FOR EACH ROW EXECUTE FUNCTION protect_tax_office_identity();
--> statement-breakpoint
CREATE FUNCTION protect_treaty_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Treaty history is immutable'; END IF;
  IF ROW(NEW.id, NEW.type, NEW.created_at) IS DISTINCT FROM ROW(OLD.id, OLD.type, OLD.created_at) THEN
    RAISE EXCEPTION 'Treaty identity is immutable';
  END IF;
  IF OLD.status = 'TERMINATED' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Terminated treaty is immutable'; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER treaty_identity BEFORE UPDATE OR DELETE ON treaties FOR EACH ROW EXECUTE FUNCTION protect_treaty_identity();
--> statement-breakpoint
CREATE FUNCTION verify_treaty_parties() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; treaty treaties; current_revision treaty_revisions;
BEGIN
  target := (to_jsonb(NEW)->>CASE WHEN TG_TABLE_NAME = 'treaties' THEN 'id' ELSE 'treaty_id' END)::uuid;
  SELECT * INTO STRICT treaty FROM treaties WHERE id = target;
  SELECT * INTO STRICT current_revision FROM treaty_revisions WHERE id = treaty.current_revision_id;
  IF current_revision.treaty_id <> target OR (SELECT count(*) FROM treaty_parties WHERE treaty_id = target) <> 2 OR
     NOT EXISTS (SELECT 1 FROM treaty_parties WHERE treaty_id = target AND state_id = treaty.proposer_state_id) THEN
    RAISE EXCEPTION 'Treaty requires exactly two parties and its own revision';
  END IF;
  IF treaty.active_revision_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM treaty_activations a JOIN treaty_revisions r ON r.id = a.revision_id WHERE r.id = treaty.active_revision_id AND r.treaty_id = target) THEN
    RAISE EXCEPTION 'Active treaty requires an activated revision';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER treaty_parties_check AFTER INSERT OR UPDATE ON treaties DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_treaty_parties();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER treaty_bilateral_check AFTER INSERT ON treaty_parties DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_treaty_parties();
--> statement-breakpoint
CREATE FUNCTION guard_economic_append() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE op economic_operations; journal ledger_transactions; operation_id uuid;
BEGIN
  operation_id := NEW.operation_id;
  SELECT * INTO STRICT op FROM economic_operations WHERE id = operation_id;
  IF op.database_transaction <> pg_current_xact_id()::text THEN RAISE EXCEPTION 'Cannot extend committed economic operation'; END IF;
  IF TG_TABLE_NAME = 'economic_journals' THEN
    SELECT * INTO STRICT journal FROM ledger_transactions WHERE id = NEW.journal_id;
    IF journal.database_transaction <> op.database_transaction OR journal.currency_id <> op.currency_id OR journal.actor_id <> op.actor_id THEN
      RAISE EXCEPTION 'Economic journals must share transaction, actor and currency';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER economic_journal_append BEFORE INSERT ON economic_journals FOR EACH ROW EXECUTE FUNCTION guard_economic_append();
--> statement-breakpoint
CREATE TRIGGER tax_assessment_append BEFORE INSERT ON tax_assessments FOR EACH ROW EXECUTE FUNCTION guard_economic_append();
--> statement-breakpoint
CREATE TRIGGER tax_claim_append BEFORE INSERT ON tax_assessment_claims FOR EACH ROW EXECUTE FUNCTION guard_economic_append();
--> statement-breakpoint
CREATE FUNCTION verify_economic_operation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE op economic_operations; charge_item jsonb; claim_item jsonb; allocation jsonb; assessment tax_assessments;
        journal_count integer := 1; claim_count integer := 0; total_tax numeric := 0;
BEGIN
  SELECT * INTO STRICT op FROM economic_operations WHERE id = NEW.id;
  IF op.event <> 'PLAYER_TRANSFER' OR op.calculation->>'senderId' <> op.actor_id::text OR op.calculation->>'recipientId' <> op.recipient_id::text OR op.calculation->>'currencyId' <> op.currency_id::text THEN
    RAISE EXCEPTION 'Economic event identity mismatch';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM ledger_transactions j JOIN economic_journals e ON e.journal_id = j.id WHERE j.id = op.id AND e.operation_id = op.id AND e.assessment_id IS NULL AND j.kind = 'TRANSFER' AND j.amount_minor = (op.calculation->>'principalMinor')::numeric AND j.idempotency_key = op.idempotency_key AND j.payload_hash = op.command_hash AND EXISTS (SELECT 1 FROM ledger_postings p JOIN financial_accounts a ON a.id = p.account_id WHERE p.transaction_id = j.id AND p.delta_minor > 0 AND a.kind = 'PLAYER' AND a.owner_id = op.recipient_id)) THEN
    RAISE EXCEPTION 'Economic event requires its exact principal transfer';
  END IF;
  FOR charge_item IN SELECT value FROM jsonb_array_elements(op.calculation->'charges') LOOP
    SELECT * INTO STRICT assessment FROM tax_assessments WHERE operation_id = op.id AND assessment_key = charge_item->>'key';
    IF assessment.charge <> charge_item OR assessment.taxpayer_id <> op.actor_id OR assessment.currency_id <> op.currency_id OR assessment.base_minor <> (op.calculation->>'principalMinor')::numeric THEN
      RAISE EXCEPTION 'Tax assessment must match the confirmed calculation';
    END IF;
    total_tax := total_tax + (charge_item->>'amountMinor')::numeric;
    claim_count := claim_count + jsonb_array_length(charge_item->'claims');
    IF (SELECT count(*) FROM tax_assessment_claims c JOIN tax_law_revisions r ON r.id = c.revision_id AND r.law_id = c.law_id WHERE c.assessment_id = assessment.id AND c.operation_id = op.id) <> jsonb_array_length(charge_item->'claims') THEN
      RAISE EXCEPTION 'Assessment requires exact revision-pinned national claims';
    END IF;
    FOR claim_item IN SELECT value FROM jsonb_array_elements(charge_item->'claims') LOOP
      IF NOT EXISTS (SELECT 1 FROM tax_assessment_claims c WHERE c.assessment_id = assessment.id AND c.operation_id = op.id AND c.law_id = (claim_item->>'lawId')::uuid AND c.revision_id = (claim_item->>'revisionId')::uuid) THEN
        RAISE EXCEPTION 'Claim rows must pin the recorded law revisions';
      END IF;
    END LOOP;
    IF (SELECT coalesce(sum((a->>'amountMinor')::numeric),0) FROM jsonb_array_elements(charge_item->'allocations') a) <> (charge_item->>'amountMinor')::numeric THEN
      RAISE EXCEPTION 'Tax allocations must conserve the assessed amount';
    END IF;
    FOR allocation IN SELECT value FROM jsonb_array_elements(charge_item->'allocations') LOOP
      IF (allocation->>'amountMinor')::numeric > 0 THEN
        journal_count := journal_count + 1;
        IF (SELECT count(*) FROM economic_journals e JOIN ledger_transactions j ON j.id = e.journal_id JOIN ledger_postings p ON p.transaction_id = j.id AND p.delta_minor > 0 JOIN financial_accounts a ON a.id = p.account_id WHERE e.operation_id = op.id AND e.assessment_id = assessment.id AND e.creditor_state_id = (allocation->>'stateId')::uuid AND j.kind = 'TRANSFER' AND j.amount_minor = (allocation->>'amountMinor')::numeric AND a.kind = 'TREASURY' AND a.owner_id = e.creditor_state_id) <> 1 THEN
          RAISE EXCEPTION 'Every tax allocation requires its exact treasury journal';
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  IF (SELECT count(*) FROM economic_journals WHERE operation_id = op.id) <> journal_count OR
     (SELECT count(*) FROM tax_assessments WHERE operation_id = op.id) <> jsonb_array_length(op.calculation->'charges') OR
     (SELECT count(*) FROM tax_assessment_claims WHERE operation_id = op.id) <> claim_count OR
     total_tax <> (op.calculation->>'totalTaxMinor')::numeric OR
     total_tax + (op.calculation->>'principalMinor')::numeric <> (op.calculation->>'totalDebitMinor')::numeric THEN
    RAISE EXCEPTION 'Economic operation must contain all and only its confirmed tax journals';
  END IF;
  IF EXISTS (SELECT 1 FROM economic_journals e JOIN ledger_postings p ON p.transaction_id = e.journal_id JOIN financial_accounts a ON a.id = p.account_id WHERE e.operation_id = op.id AND p.delta_minor < 0 AND (a.kind <> 'PLAYER' OR a.owner_id <> op.actor_id)) THEN
    RAISE EXCEPTION 'Only the event taxpayer may fund its journals';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER economic_operation_complete AFTER INSERT ON economic_operations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_economic_operation();

--> statement-breakpoint
CREATE TRIGGER economic_directive_document_history BEFORE UPDATE OR DELETE ON economic_directive_documents FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
