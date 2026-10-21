-- Preserve old journals and JSON evidence. Missing liability/base/beneficiary fields retain V1 semantics.
CREATE OR REPLACE FUNCTION verify_economic_operation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  op economic_operations;
  charge_item jsonb;
  claim_item jsonb;
  allocation jsonb;
  assessment tax_assessments;
  journal_count integer := 1;
  claim_count integer := 0;
  total_tax numeric := 0;
  recipient_tax numeric := 0;
  principal numeric;
  taxpayer uuid;
  beneficiary_kind text;
  beneficiary_id uuid;
BEGIN
  SELECT * INTO STRICT op FROM economic_operations WHERE id = NEW.id;
  principal := (op.calculation->>'principalMinor')::numeric;
  IF op.event <> 'PLAYER_TRANSFER' OR
     op.calculation->>'event' IS DISTINCT FROM op.event OR
     op.calculation->>'senderId' IS DISTINCT FROM op.actor_id::text OR
     op.calculation->>'recipientId' IS DISTINCT FROM op.recipient_id::text OR
     op.calculation->>'currencyId' IS DISTINCT FROM op.currency_id::text OR
     principal IS NULL OR principal <= 0 OR
     jsonb_typeof(op.calculation->'charges') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Economic event identity mismatch';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM ledger_transactions j
    JOIN economic_journals e ON e.journal_id = j.id
    WHERE j.id = op.id AND e.operation_id = op.id AND e.assessment_id IS NULL
      AND e.creditor_state_id IS NULL AND j.kind = 'TRANSFER' AND j.amount_minor = principal
      AND j.idempotency_key = op.idempotency_key AND j.payload_hash = op.command_hash
      AND EXISTS (
        SELECT 1 FROM ledger_postings p JOIN financial_accounts a ON a.id = p.account_id
        WHERE p.transaction_id = j.id AND p.delta_minor = principal
          AND a.kind = 'PLAYER' AND a.owner_id = op.recipient_id
      )
  ) THEN
    RAISE EXCEPTION 'Economic event requires its exact principal transfer';
  END IF;
  FOR charge_item IN SELECT value FROM jsonb_array_elements(op.calculation->'charges') LOOP
    IF coalesce(charge_item->>'taxpayer', 'SENDER') NOT IN ('SENDER', 'RECIPIENT') OR
       (charge_item->>'amountMinor')::numeric IS NULL OR
       (charge_item->>'amountMinor')::numeric < 0 THEN
      RAISE EXCEPTION 'Invalid tax liability';
    END IF;
    taxpayer := CASE WHEN charge_item->>'taxpayer' = 'RECIPIENT' THEN op.recipient_id ELSE op.actor_id END;
    SELECT * INTO STRICT assessment FROM tax_assessments
      WHERE operation_id = op.id AND assessment_key = charge_item->>'key';
    IF assessment.charge IS DISTINCT FROM charge_item OR
       assessment.taxpayer_id <> taxpayer OR assessment.currency_id <> op.currency_id OR
       assessment.base_minor IS DISTINCT FROM coalesce((charge_item->>'baseMinor')::numeric, principal) OR
       assessment.base_minor < 0 OR assessment.base_minor > principal THEN
      RAISE EXCEPTION 'Tax assessment must match the confirmed calculation';
    END IF;
    total_tax := total_tax + (charge_item->>'amountMinor')::numeric;
    IF charge_item->>'taxpayer' = 'RECIPIENT' THEN
      recipient_tax := recipient_tax + (charge_item->>'amountMinor')::numeric;
    END IF;
    claim_count := claim_count + jsonb_array_length(charge_item->'claims');
    IF (SELECT count(*) FROM tax_assessment_claims c
        JOIN tax_law_revisions r ON r.id = c.revision_id AND r.law_id = c.law_id
        WHERE c.assessment_id = assessment.id AND c.operation_id = op.id
    ) <> jsonb_array_length(charge_item->'claims') THEN
      RAISE EXCEPTION 'Assessment requires exact revision-pinned national claims';
    END IF;
    FOR claim_item IN SELECT value FROM jsonb_array_elements(charge_item->'claims') LOOP
      IF coalesce(claim_item->>'taxpayer', 'SENDER') <> coalesce(charge_item->>'taxpayer', 'SENDER') OR
         NOT EXISTS (
           SELECT 1 FROM tax_assessment_claims c
           WHERE c.assessment_id = assessment.id AND c.operation_id = op.id
             AND c.law_id = (claim_item->>'lawId')::uuid
             AND c.revision_id = (claim_item->>'revisionId')::uuid
         ) THEN
        RAISE EXCEPTION 'Claim rows must pin the recorded law revisions and taxpayer';
      END IF;
    END LOOP;
    IF (SELECT coalesce(sum((a->>'amountMinor')::numeric), 0)
        FROM jsonb_array_elements(charge_item->'allocations') a
    ) <> (charge_item->>'amountMinor')::numeric THEN
      RAISE EXCEPTION 'Tax allocations must conserve the assessed amount';
    END IF;
    FOR allocation IN SELECT value FROM jsonb_array_elements(charge_item->'allocations') LOOP
      beneficiary_kind := coalesce(allocation->'beneficiary'->>'kind', 'TREASURY');
      beneficiary_id := coalesce(allocation->'beneficiary'->>'ownerId', allocation->>'stateId')::uuid;
      IF beneficiary_kind NOT IN ('TREASURY', 'CENTRAL_BANK') OR
         (beneficiary_kind = 'TREASURY' AND beneficiary_id IS DISTINCT FROM (allocation->>'stateId')::uuid) OR
         (beneficiary_kind = 'CENTRAL_BANK' AND NOT EXISTS (
           SELECT 1 FROM central_banks b
           WHERE b.id = beneficiary_id AND b.state_id = (allocation->>'stateId')::uuid
         )) OR
         (allocation->>'amountMinor')::numeric IS NULL OR (allocation->>'amountMinor')::numeric < 0 THEN
        RAISE EXCEPTION 'Invalid approved tax beneficiary';
      END IF;
      IF (allocation->>'amountMinor')::numeric > 0 THEN
        journal_count := journal_count + 1;
        IF (SELECT count(*) FROM economic_journals e
            JOIN ledger_transactions j ON j.id = e.journal_id
            JOIN ledger_postings p ON p.transaction_id = j.id AND p.delta_minor > 0
            JOIN financial_accounts a ON a.id = p.account_id
            WHERE e.operation_id = op.id AND e.assessment_id = assessment.id
              AND e.creditor_state_id = (allocation->>'stateId')::uuid
              AND j.kind = 'TRANSFER' AND j.amount_minor = (allocation->>'amountMinor')::numeric
              AND a.kind = beneficiary_kind AND a.owner_id = beneficiary_id
        ) <> 1 THEN
          RAISE EXCEPTION 'Every tax allocation requires its exact approved beneficiary journal';
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  IF (SELECT count(*) FROM economic_journals WHERE operation_id = op.id) <> journal_count OR
     (SELECT count(*) FROM tax_assessments WHERE operation_id = op.id) <> jsonb_array_length(op.calculation->'charges') OR
     (SELECT count(*) FROM tax_assessment_claims WHERE operation_id = op.id) <> claim_count OR
     total_tax IS DISTINCT FROM (op.calculation->>'totalTaxMinor')::numeric OR
     principal + total_tax - recipient_tax IS DISTINCT FROM (op.calculation->>'totalDebitMinor')::numeric OR
     principal - recipient_tax IS DISTINCT FROM coalesce((op.calculation->>'recipientCreditMinor')::numeric, principal) OR
     recipient_tax > principal THEN
    RAISE EXCEPTION 'Economic operation must contain all and only its confirmed tax journals';
  END IF;
  IF EXISTS (
    SELECT 1 FROM economic_journals e
    JOIN ledger_postings p ON p.transaction_id = e.journal_id
    JOIN financial_accounts a ON a.id = p.account_id
    LEFT JOIN tax_assessments t ON t.id = e.assessment_id
    WHERE e.operation_id = op.id AND p.delta_minor < 0
      AND (a.kind <> 'PLAYER' OR a.owner_id <> CASE WHEN e.assessment_id IS NULL THEN op.actor_id ELSE t.taxpayer_id END
           OR (e.assessment_id IS NOT NULL AND t.operation_id <> op.id))
  ) THEN
    RAISE EXCEPTION 'Only the confirmed payer may fund each economic journal';
  END IF;
  RETURN NULL;
END;
$$;
