-- Exact obligations use 1/100000000 of a minor unit: rate basis points times distribution basis points.
CREATE FUNCTION protect_tax_fractional_balance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' OR pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'Tax fractional balances may only advance from immutable movements';
  END IF;
  IF TG_OP = 'UPDATE' AND ROW(NEW.key, NEW.taxpayer_id, NEW.currency_id, NEW.obligation_key,
      NEW.creditor_state_id, NEW.beneficiary_kind, NEW.beneficiary_id) IS DISTINCT FROM
      ROW(OLD.key, OLD.taxpayer_id, OLD.currency_id, OLD.obligation_key,
      OLD.creditor_state_id, OLD.beneficiary_kind, OLD.beneficiary_id) THEN
    RAISE EXCEPTION 'Tax fractional identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER tax_fractional_balance_guard BEFORE INSERT OR UPDATE OR DELETE ON tax_fractional_balances
FOR EACH ROW EXECUTE FUNCTION protect_tax_fractional_balance();
--> statement-breakpoint
CREATE FUNCTION apply_tax_fractional_movement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  assessment tax_assessments;
  op economic_operations;
  allocation jsonb;
  accrual jsonb;
  identity_key text;
  obligation text;
  creditor uuid;
  beneficiary_kind text;
  beneficiary uuid;
  previous_remainder numeric;
  expected_numerator numeric;
BEGIN
  SELECT * INTO STRICT assessment FROM tax_assessments WHERE id = NEW.assessment_id;
  SELECT * INTO STRICT op FROM economic_operations WHERE id = assessment.operation_id;
  IF op.database_transaction <> pg_current_xact_id()::text THEN
    RAISE EXCEPTION 'Cannot extend a committed fractional tax assessment';
  END IF;
  SELECT value INTO STRICT allocation FROM jsonb_array_elements(assessment.charge->'allocations')
    WHERE value->'accrual'->>'key' = NEW.balance_key;
  accrual := allocation->'accrual';
  creditor := (allocation->>'stateId')::uuid;
  beneficiary_kind := coalesce(allocation->'beneficiary'->>'kind', 'TREASURY');
  beneficiary := coalesce(allocation->'beneficiary'->>'ownerId', allocation->>'stateId')::uuid;
  obligation := CASE WHEN assessment.charge->>'mode' = 'SHARED'
    THEN 'treaty:' || (assessment.charge->>'treatyId')
    ELSE 'law:' || (assessment.charge->'claims'->0->>'lawId') END;
  identity_key := concat_ws(':', assessment.taxpayer_id::text, assessment.currency_id::text,
    obligation, creditor::text, beneficiary_kind, beneficiary::text);
  expected_numerator := CASE WHEN coalesce((assessment.charge->>'exempt')::boolean, false)
    THEN 0 ELSE assessment.base_minor * (assessment.charge->>'rateBps')::numeric * (allocation->>'shareBps')::numeric END;
  IF NEW.balance_key IS DISTINCT FROM identity_key OR
     accrual->>'denominator' IS DISTINCT FROM '100000000' OR
     NEW.exact_numerator IS DISTINCT FROM expected_numerator OR
     NEW.exact_numerator IS DISTINCT FROM (accrual->>'exactNumerator')::numeric OR
     NEW.remainder_before IS DISTINCT FROM (accrual->>'remainderBefore')::numeric OR
     NEW.remainder_after IS DISTINCT FROM (accrual->>'remainderAfter')::numeric OR
     NEW.collected_minor IS DISTINCT FROM (allocation->>'amountMinor')::numeric THEN
    RAISE EXCEPTION 'Fractional movement must match its exact confirmed legal calculation';
  END IF;
  INSERT INTO tax_fractional_balances
    (key, taxpayer_id, currency_id, obligation_key, creditor_state_id, beneficiary_kind, beneficiary_id)
    VALUES (identity_key, assessment.taxpayer_id, assessment.currency_id, obligation, creditor, beneficiary_kind, beneficiary)
    ON CONFLICT DO NOTHING;
  SELECT remainder INTO STRICT previous_remainder FROM tax_fractional_balances WHERE key = identity_key FOR UPDATE;
  IF NEW.remainder_before <> previous_remainder THEN
    RAISE EXCEPTION 'Fractional obligation changed after confirmation';
  END IF;
  UPDATE tax_fractional_balances SET remainder = NEW.remainder_after WHERE key = identity_key;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER tax_fractional_movement_apply BEFORE INSERT ON tax_fractional_movements
FOR EACH ROW EXECUTE FUNCTION apply_tax_fractional_movement();
--> statement-breakpoint
CREATE TRIGGER tax_fractional_movement_history BEFORE UPDATE OR DELETE ON tax_fractional_movements
FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE FUNCTION verify_tax_fractional_operation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE op economic_operations; charge_item jsonb; allocation jsonb; expected_count integer := 0;
BEGIN
  SELECT * INTO STRICT op FROM economic_operations WHERE id = NEW.id;
  FOR charge_item IN SELECT value FROM jsonb_array_elements(op.calculation->'charges') LOOP
    FOR allocation IN SELECT value FROM jsonb_array_elements(charge_item->'allocations') LOOP
      expected_count := expected_count + 1;
      IF jsonb_typeof(allocation->'accrual') IS DISTINCT FROM 'object' OR NOT EXISTS (
        SELECT 1 FROM tax_fractional_movements m JOIN tax_assessments a ON a.id = m.assessment_id
        WHERE a.operation_id = op.id AND a.assessment_key = charge_item->>'key'
          AND m.balance_key = allocation->'accrual'->>'key'
      ) THEN
        RAISE EXCEPTION 'Every tax allocation requires immutable fractional obligation evidence';
      END IF;
    END LOOP;
  END LOOP;
  IF (SELECT count(*) FROM tax_fractional_movements m JOIN tax_assessments a ON a.id = m.assessment_id
      WHERE a.operation_id = op.id) <> expected_count THEN
    RAISE EXCEPTION 'Economic operation must retain all and only its fractional tax movements';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER tax_fractional_operation_complete AFTER INSERT ON economic_operations
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_tax_fractional_operation();
