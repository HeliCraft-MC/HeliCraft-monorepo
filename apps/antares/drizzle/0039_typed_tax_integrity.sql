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
  IF op.event <> (CASE WHEN op.sender_kind = 'PLAYER' THEN CASE WHEN op.recipient_kind = 'PLAYER' THEN 'PLAYER_TRANSFER' ELSE 'PLAYER_COMPANY_TRANSFER' END ELSE CASE WHEN op.recipient_kind = 'PLAYER' THEN 'COMPANY_PLAYER_TRANSFER' ELSE 'COMPANY_TRANSFER' END END) OR
     op.calculation->>'event' IS DISTINCT FROM op.event OR
     op.calculation->>'senderId' IS DISTINCT FROM op.sender_id::text OR
     coalesce(op.calculation->>'senderKind', 'PLAYER') IS DISTINCT FROM op.sender_kind OR
     coalesce(op.calculation->>'recipientKind', 'PLAYER') IS DISTINCT FROM op.recipient_kind OR
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
          AND a.kind = op.recipient_kind AND a.owner_id = op.recipient_id
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
    taxpayer := CASE WHEN charge_item->>'taxpayer' = 'RECIPIENT' THEN op.recipient_id ELSE op.sender_id END;
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
             AND c.regime_revision_id IS NOT DISTINCT FROM (claim_item->'regime'->>'revisionId')::uuid
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
      AND (a.kind <> CASE WHEN e.assessment_id IS NOT NULL AND t.charge->>'taxpayer' = 'RECIPIENT' THEN op.recipient_kind ELSE op.sender_kind END OR a.owner_id <> CASE WHEN e.assessment_id IS NULL THEN op.sender_id ELSE t.taxpayer_id END
           OR (e.assessment_id IS NOT NULL AND t.operation_id <> op.id))
  ) THEN
    RAISE EXCEPTION 'Only the confirmed payer may fund each economic journal';
  END IF;
  RETURN NULL;
END;
$$;

--> statement-breakpoint
ALTER TABLE economic_operations ADD CONSTRAINT economic_company_source FOREIGN KEY (company_decision_id) REFERENCES company_decisions(id);
--> statement-breakpoint
ALTER TABLE company_decisions ADD CONSTRAINT company_financial_quote_source FOREIGN KEY (tax_quote_id) REFERENCES transfer_quotes(id);
--> statement-breakpoint
ALTER TABLE economic_operations ADD CONSTRAINT economic_legal_party_kinds CHECK (sender_kind IN ('PLAYER','COMPANY') AND recipient_kind IN ('PLAYER','COMPANY'));
--> statement-breakpoint
CREATE FUNCTION guard_company_payment_quote() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE quote transfer_quotes;
BEGIN
  IF NEW.tax_quote_id IS DISTINCT FROM (NEW.payload->>'quoteId')::uuid THEN RAISE EXCEPTION 'Corporate quote reference must match its immutable payload'; END IF;
  IF NEW.payload->>'kind' = 'TRANSFER_FUNDS' AND NEW.payload->'recipient'->>'type' IN ('PLAYER','COMPANY') THEN
    SELECT * INTO STRICT quote FROM transfer_quotes WHERE id = NEW.tax_quote_id;
    IF quote.actor_id <> NEW.created_by OR quote.expires_at <= NEW.created_at OR quote.created_at > NEW.created_at OR
       quote.calculation->>'senderKind' IS DISTINCT FROM 'COMPANY' OR quote.calculation->>'senderId' IS DISTINCT FROM NEW.company_id::text OR
       quote.calculation->>'recipientKind' IS DISTINCT FROM NEW.payload->'recipient'->>'type' OR
       quote.calculation->>'recipientId' IS DISTINCT FROM NEW.payload->'recipient'->>'id' OR
       quote.calculation->>'currencyId' IS DISTINCT FROM NEW.payload->>'currencyId' OR
       quote.calculation->>'sourceBranchId' IS DISTINCT FROM NEW.payload->>'sourceBranchId' OR
       quote.calculation->>'principalMinor' IS DISTINCT FROM NEW.payload->>'amountMinor' OR
       quote.calculation->>'totalDebitMinor' IS DISTINCT FROM NEW.payload->>'approvedDebitMinor' THEN
      RAISE EXCEPTION 'Corporate approvals require the exact timely legal-party tax quote and full debit';
    END IF;
  ELSIF NEW.tax_quote_id IS NOT NULL THEN RAISE EXCEPTION 'Only taxable corporate payments consume a tax quote';
  ELSIF NEW.payload->>'kind' = 'TRANSFER_FUNDS' AND (NEW.payload ? 'sourceBranchId' OR (NEW.payload ? 'approvedDebitMinor' AND NEW.payload->>'approvedDebitMinor' IS DISTINCT FROM NEW.payload->>'amountMinor')) THEN RAISE EXCEPTION 'A treasury remittance must approve its exact full debit without taxable attribution';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_payment_quote_guard BEFORE INSERT ON company_decisions FOR EACH ROW EXECUTE FUNCTION guard_company_payment_quote();
--> statement-breakpoint
CREATE FUNCTION verify_typed_economic_source() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE op economic_operations; source company_decisions; quote transfer_quotes; journal ledger_transactions; claim jsonb; charge jsonb;
        law tax_law_revisions; special tax_law_revisions; payer uuid;
BEGIN
  SELECT * INTO STRICT op FROM economic_operations WHERE id = NEW.id;
  SELECT * INTO STRICT journal FROM ledger_transactions WHERE id = op.id;
  IF NOT EXISTS (SELECT 1 FROM legal_subjects WHERE id = op.sender_id AND kind = op.sender_kind) OR
     NOT EXISTS (SELECT 1 FROM legal_subjects WHERE id = op.recipient_id AND kind = op.recipient_kind) OR op.sender_id = op.recipient_id OR
     journal.actor_id <> op.actor_id OR journal.company_decision_id IS DISTINCT FROM op.company_decision_id THEN
    RAISE EXCEPTION 'Economic parties and executing representative must match their actual legal identities and principal journal';
  END IF;
  IF op.sender_kind = 'PLAYER' THEN
    IF op.sender_id <> op.actor_id OR op.initiator_id <> op.actor_id OR op.company_decision_id IS NOT NULL OR op.calculation ? 'sourceBranchId' THEN
      RAISE EXCEPTION 'A personal payment cannot impersonate a legal company or branch';
    END IF;
  ELSE
    SELECT * INTO STRICT source FROM company_decisions WHERE id = op.company_decision_id;
    IF source.status <> 'APPLIED' OR source.company_id <> op.sender_id OR source.created_by <> op.initiator_id OR source.applied_by IS DISTINCT FROM op.actor_id OR
       source.revision_id IS DISTINCT FROM (SELECT current_revision_id FROM companies WHERE id = op.sender_id) OR
       source.payload->>'kind' IS DISTINCT FROM 'TRANSFER_FUNDS' OR source.payload->>'currencyId' IS DISTINCT FROM op.currency_id::text OR
       source.payload->>'amountMinor' IS DISTINCT FROM op.calculation->>'principalMinor' OR source.payload->>'approvedDebitMinor' IS DISTINCT FROM op.calculation->>'totalDebitMinor' OR
       source.payload->'recipient'->>'type' IS DISTINCT FROM op.recipient_kind OR source.payload->'recipient'->>'id' IS DISTINCT FROM op.recipient_id::text OR
       source.payload->>'sourceBranchId' IS DISTINCT FROM op.calculation->>'sourceBranchId' OR source.payload->>'purpose' IS DISTINCT FROM journal.purpose OR
       source.id <> op.idempotency_key OR source.tax_quote_id IS DISTINCT FROM op.quote_id THEN
      RAISE EXCEPTION 'Corporate settlement requires its exact applied Governance source, legal parties, full debit and original quote';
    END IF;
    IF op.calculation ? 'sourceBranchId' AND NOT EXISTS (
      SELECT 1 FROM company_branches b JOIN states s ON s.id = b.state_id
      WHERE b.id = (op.calculation->>'sourceBranchId')::uuid AND b.company_id = op.sender_id AND b.status = 'ACTIVE' AND s.status = 'ACTIVE'
    ) THEN RAISE EXCEPTION 'Financial branch attribution requires the actual active branch approved in the corporate source'; END IF;
  END IF;
  IF op.quote_id IS NOT NULL THEN
    SELECT * INTO STRICT quote FROM transfer_quotes WHERE id = op.quote_id;
    IF quote.actor_id <> op.initiator_id OR quote.calculation IS DISTINCT FROM op.calculation OR
       (op.sender_kind = 'PLAYER' AND (quote.command_hash <> op.command_hash OR quote.expires_at <= op.created_at)) THEN
      RAISE EXCEPTION 'Settlement cannot substitute the approved immutable tax calculation';
    END IF;
  ELSIF op.sender_kind = 'COMPANY' OR jsonb_array_length(op.calculation->'charges') <> 0 THEN
    RAISE EXCEPTION 'A taxable obligation or corporate approval requires its exact quote';
  END IF;
  FOR charge IN SELECT value FROM jsonb_array_elements(op.calculation->'charges') LOOP
    payer := CASE WHEN charge->>'taxpayer' = 'RECIPIENT' THEN op.recipient_id ELSE op.sender_id END;
    FOR claim IN SELECT value FROM jsonb_array_elements(charge->'claims') LOOP
      SELECT * INTO STRICT law FROM tax_law_revisions WHERE id = (claim->>'revisionId')::uuid AND law_id = (claim->>'lawId')::uuid;
      IF NOT EXISTS (SELECT 1 FROM tax_laws WHERE id = law.law_id AND state_id = (claim->>'stateId')::uuid) THEN RAISE EXCEPTION 'Tax law creditor identity mismatch'; END IF;
      IF claim ? 'regime' THEN
        SELECT * INTO STRICT special FROM tax_law_revisions WHERE id = (claim->'regime'->>'revisionId')::uuid AND law_id = (claim->'regime'->>'lawId')::uuid;
        IF special.rule->'regime'->>'companyId' IS DISTINCT FROM payer::text OR
           special.rule->'regime'->>'mode' IS DISTINCT FROM claim->'regime'->>'mode' OR
           special.rule->>'taxpayer' IS DISTINCT FROM coalesce(claim->>'taxpayer','SENDER') OR
           NOT EXISTS (SELECT 1 FROM legal_subjects WHERE id = payer AND kind = 'COMPANY') OR
           NOT EXISTS (SELECT 1 FROM tax_laws WHERE id = special.law_id AND state_id = (claim->>'stateId')::uuid) OR
           (special.rule->'regime'->>'mode' <> 'ADDITIONAL' AND special.rule->'regime'->>'targetLawId' IS DISTINCT FROM law.law_id::text) OR
           (special.rule->'regime'->>'mode' = 'ADDITIONAL' AND special.id <> law.id) OR
           (special.rule->'regime'->>'branchId' IS NOT NULL AND (charge->>'taxpayer' IS DISTINCT FROM 'SENDER' OR special.rule->'regime'->>'branchId' IS DISTINCT FROM op.calculation->>'sourceBranchId')) THEN
          RAISE EXCEPTION 'A special tax rule must bind the exact taxpayer, national claim, branch and approved regime revision';
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER typed_economic_source_complete AFTER INSERT ON economic_operations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_typed_economic_source();

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
