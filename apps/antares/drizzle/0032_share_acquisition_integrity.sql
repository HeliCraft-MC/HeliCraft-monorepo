ALTER TABLE company_share_operations ADD CONSTRAINT share_operation_revision_scope FOREIGN KEY (issuer_revision_id, issuer_id) REFERENCES company_revisions(id, company_id);
--> statement-breakpoint
ALTER TABLE company_share_events ADD CONSTRAINT share_event_operation_scope FOREIGN KEY (operation_id, company_id) REFERENCES company_share_operations(id, issuer_id);
--> statement-breakpoint
ALTER TABLE company_share_acceptances ADD CONSTRAINT share_acceptance_event FOREIGN KEY (event_id) REFERENCES company_share_events(id);
--> statement-breakpoint
ALTER TABLE company_share_acceptances ADD CONSTRAINT share_acceptance_posting FOREIGN KEY (event_id, subject_id) REFERENCES company_share_postings(event_id, subject_id);
--> statement-breakpoint
DO $$ DECLARE relation_name text; BEGIN
  FOREACH relation_name IN ARRAY ARRAY['company_share_operations','company_share_consents','company_share_consent_revocations','company_share_acceptances'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation()', relation_name || '_immutable', relation_name);
  END LOOP;
END; $$;
--> statement-breakpoint
CREATE FUNCTION share_subject_active(subject_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM legal_subjects s
    LEFT JOIN users u ON u.id = s.player_id LEFT JOIN states st ON st.id = s.state_id LEFT JOIN companies c ON c.id = s.company_id
    WHERE s.id = $1 AND ((s.kind = 'PLAYER' AND u.status = 'ACTIVE') OR (s.kind = 'STATE' AND st.status = 'ACTIVE') OR (s.kind = 'COMPANY' AND c.status = 'ACTIVE')));
$$;
--> statement-breakpoint
CREATE FUNCTION guard_share_operation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE issuer companies; allocation jsonb; subject legal_subjects; terms jsonb; total numeric := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(741023);
  SELECT * INTO STRICT issuer FROM companies WHERE id = NEW.issuer_id FOR UPDATE;
  terms := NEW.terms;
  IF issuer.status <> 'ACTIVE' OR issuer.current_revision_id IS DISTINCT FROM NEW.issuer_revision_id OR
     (terms->>'operationId')::uuid IS DISTINCT FROM NEW.id OR (terms->>'issuerId')::uuid IS DISTINCT FROM issuer.id OR
     (terms->>'issuerRevisionId')::uuid IS DISTINCT FROM NEW.issuer_revision_id OR
     jsonb_typeof(terms->'shares') IS DISTINCT FROM 'string' OR (terms->>'shares' ~ '^[1-9][0-9]{0,29}$') IS NOT TRUE OR
     NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.created_by AND status = 'ACTIVE') THEN
    RAISE EXCEPTION 'Share operation requires an active issuer, exact revision, quantity and actor';
  END IF;
  IF terms->>'kind' = 'ISSUE' THEN
    IF jsonb_typeof(terms->'allocations') IS DISTINCT FROM 'array' OR jsonb_array_length(terms->'allocations') NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Share issuance requires receiving allocations'; END IF;
    FOR allocation IN SELECT value FROM jsonb_array_elements(terms->'allocations') LOOP
      SELECT * INTO STRICT subject FROM legal_subjects WHERE id = (allocation->'owner'->>'id')::uuid;
      IF subject.kind IS DISTINCT FROM allocation->'owner'->>'type' OR NOT share_subject_active(subject.id) OR
         (subject.kind = 'COMPANY' AND subject.id = issuer.id) OR jsonb_typeof(allocation->'shares') IS DISTINCT FROM 'string' OR
         (allocation->>'shares' ~ '^[1-9][0-9]{0,29}$') IS NOT TRUE THEN RAISE EXCEPTION 'Each receiving lot requires its actual active legal owner and exact positive shares'; END IF;
      total := total + (allocation->>'shares')::numeric;
    END LOOP;
    IF total <> (terms->>'shares')::numeric OR issuer.issued_shares + total >= 1000000000000000000000000000000 OR
       (SELECT count(DISTINCT entry.value->'owner'->>'id') FROM jsonb_array_elements(terms->'allocations') AS entry(value)) <> jsonb_array_length(terms->'allocations') THEN
      RAISE EXCEPTION 'Issued allocations must conserve the exact quantity without duplicate owners';
    END IF;
  ELSIF terms->>'kind' = 'TRANSFER' THEN
    SELECT * INTO STRICT subject FROM legal_subjects WHERE id = (terms->'owner'->>'id')::uuid;
    IF subject.kind IS DISTINCT FROM terms->'owner'->>'type' OR NOT share_subject_active(subject.id) OR
       coalesce((SELECT shares FROM company_share_balances WHERE company_id = issuer.id AND subject_id = subject.id), 0) < (terms->>'shares')::numeric THEN
      RAISE EXCEPTION 'A transfer proposal requires an actual funded owner';
    END IF;
    SELECT * INTO STRICT subject FROM legal_subjects WHERE id = (terms->'recipient'->>'id')::uuid;
    IF subject.kind IS DISTINCT FROM terms->'recipient'->>'type' OR NOT share_subject_active(subject.id) OR
       terms->'owner'->>'id' = terms->'recipient'->>'id' OR (subject.kind = 'COMPANY' AND subject.id = issuer.id) THEN
      RAISE EXCEPTION 'A transfer requires a different active legal recipient and cannot create self ownership';
    END IF;
  ELSE RAISE EXCEPTION 'Unknown share operation kind'; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER share_operation_guard BEFORE INSERT ON company_share_operations FOR EACH ROW EXECUTE FUNCTION guard_share_operation();
--> statement-breakpoint
CREATE FUNCTION verify_share_consent() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE operation company_share_operations; subject legal_subjects; source_payload jsonb; source_status text; source_owner uuid; source_actor uuid;
BEGIN
  SELECT * INTO STRICT operation FROM company_share_operations WHERE id = NEW.operation_id;
  SELECT * INTO STRICT subject FROM legal_subjects WHERE id = NEW.subject_id;
  IF operation.terms->>'kind' = 'ISSUE' THEN
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(operation.terms->'allocations') a WHERE a->'owner'->>'id' = subject.id::text AND a->'owner'->>'type' = subject.kind) THEN RAISE EXCEPTION 'Consent must name an actual receiving allocation'; END IF;
  ELSIF operation.terms->'recipient'->>'id' IS DISTINCT FROM subject.id::text OR operation.terms->'recipient'->>'type' IS DISTINCT FROM subject.kind THEN
    RAISE EXCEPTION 'Consent must come from this exact transfer recipient';
  END IF;
  IF NOT share_subject_active(subject.id) THEN RAISE EXCEPTION 'New acquisition consent requires an active legal owner'; END IF;
  IF subject.kind = 'PLAYER' THEN
    IF NEW.actor_id <> subject.player_id OR NEW.company_decision_id IS NOT NULL OR NEW.state_directive_id IS NOT NULL THEN RAISE EXCEPTION 'Only the actual personal recipient may consent'; END IF;
  ELSE
    IF subject.kind = 'COMPANY' THEN
      IF NEW.state_directive_id IS NOT NULL THEN RAISE EXCEPTION 'Corporate consent requires corporate Governance'; END IF;
      SELECT payload, status, company_id, created_by INTO STRICT source_payload, source_status, source_owner, source_actor FROM company_decisions WHERE id = NEW.company_decision_id;
    ELSE
      IF NEW.company_decision_id IS NOT NULL THEN RAISE EXCEPTION 'State consent requires state Governance'; END IF;
      SELECT payload, status, state_id, created_by INTO STRICT source_payload, source_status, source_owner, source_actor FROM monetary_directives WHERE id = NEW.state_directive_id;
    END IF;
    IF source_status <> 'APPLIED' OR source_owner <> subject.id OR source_actor <> NEW.actor_id OR source_payload->>'kind' IS DISTINCT FROM 'ACCEPT_SHARE_ACQUISITION' OR source_payload->'operation' IS DISTINCT FROM operation.terms THEN
      RAISE EXCEPTION 'Legal entity acquisition consent requires its exact completed Governance decision';
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER share_consent_complete AFTER INSERT ON company_share_consents DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_share_consent();
--> statement-breakpoint
CREATE FUNCTION verify_share_consent_revocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE consent company_share_consents; subject legal_subjects; source_payload jsonb; source_status text; source_owner uuid; source_actor uuid;
BEGIN
  SELECT * INTO STRICT consent FROM company_share_consents WHERE id = NEW.consent_id;
  SELECT * INTO STRICT subject FROM legal_subjects WHERE id = consent.subject_id;
  IF EXISTS (SELECT 1 FROM company_share_events WHERE operation_id = consent.operation_id) OR EXISTS (SELECT 1 FROM company_share_acceptances WHERE consent_id = consent.id) THEN RAISE EXCEPTION 'Completed acquisition cannot be revoked retroactively'; END IF;
  IF subject.kind = 'PLAYER' THEN
    IF NEW.actor_id <> subject.player_id OR NEW.company_decision_id IS NOT NULL OR NEW.state_directive_id IS NOT NULL THEN RAISE EXCEPTION 'Only a personal recipient may revoke their own unused consent'; END IF;
  ELSE
    IF subject.kind = 'COMPANY' THEN
      IF NEW.state_directive_id IS NOT NULL THEN RAISE EXCEPTION 'Corporate revocation requires corporate Governance'; END IF;
      SELECT payload, status, company_id, applied_by INTO STRICT source_payload, source_status, source_owner, source_actor FROM company_decisions WHERE id = NEW.company_decision_id;
      IF source_actor IS DISTINCT FROM NEW.actor_id THEN RAISE EXCEPTION 'Corporate revocation retains its actual executor'; END IF;
    ELSE
      IF NEW.company_decision_id IS NOT NULL THEN RAISE EXCEPTION 'State revocation requires state Governance'; END IF;
      SELECT payload, status, state_id INTO STRICT source_payload, source_status, source_owner FROM monetary_directives WHERE id = NEW.state_directive_id;
    END IF;
    IF source_status <> 'APPLIED' OR source_owner <> subject.id OR source_payload->>'kind' IS DISTINCT FROM 'REVOKE_SHARE_ACQUISITION' OR source_payload->>'consentId' IS DISTINCT FROM consent.id::text THEN
      RAISE EXCEPTION 'Legal entity revocation requires its exact completed owner decision';
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER share_consent_revocation_complete AFTER INSERT ON company_share_consent_revocations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_share_consent_revocation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_company_share_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE company companies; application company_registration_applications; decision company_decisions; directive monetary_directives;
        operation company_share_operations; subject legal_subjects; recipient legal_subjects; charter company_revisions;
BEGIN
  PERFORM pg_advisory_xact_lock(741023);
  SELECT * INTO STRICT company FROM companies WHERE id = NEW.company_id FOR UPDATE;
  IF company.status <> 'ACTIVE' OR NEW.database_transaction <> pg_current_xact_id()::text THEN RAISE EXCEPTION 'Ownership changes require an active issuer and a new atomic journal'; END IF;
  IF NEW.kind = 'INITIAL' THEN
    SELECT * INTO STRICT application FROM company_registration_applications WHERE id = NEW.application_id;
    IF NEW.operation_id IS NOT NULL OR NEW.authorization_decision_id IS NOT NULL OR NEW.state_directive_id IS NOT NULL OR application.company_id <> company.id OR application.status <> 'APPROVED' OR application.total_shares <> NEW.shares OR company.issued_shares <> 0 OR
       EXISTS (SELECT 1 FROM company_share_events WHERE company_id = company.id AND kind = 'INITIAL') THEN RAISE EXCEPTION 'Initial ownership requires the exact approved registration'; END IF;
  ELSE
    SELECT * INTO STRICT operation FROM company_share_operations WHERE id = NEW.operation_id;
    IF operation.id IS DISTINCT FROM NEW.id OR operation.issuer_id <> company.id OR operation.issuer_revision_id IS DISTINCT FROM company.current_revision_id OR
       operation.terms->>'kind' IS DISTINCT FROM NEW.kind OR (operation.terms->>'shares')::numeric IS DISTINCT FROM NEW.shares THEN RAISE EXCEPTION 'Share journal must bind its exact current immutable operation'; END IF;
    IF NEW.kind = 'ISSUE' THEN
      SELECT * INTO STRICT decision FROM company_decisions WHERE id = NEW.decision_id;
      IF NEW.state_directive_id IS NOT NULL OR NEW.authorization_decision_id IS NOT NULL OR decision.company_id <> company.id OR decision.revision_id IS DISTINCT FROM company.current_revision_id OR
         decision.payload->>'kind' IS DISTINCT FROM 'ISSUE_SHARES' OR decision.payload->'operation' IS DISTINCT FROM operation.terms THEN RAISE EXCEPTION 'Issuance requires its exact issuer decision'; END IF;
    ELSE
      SELECT * INTO STRICT subject FROM legal_subjects WHERE id = NEW.from_subject_id;
      SELECT * INTO STRICT recipient FROM legal_subjects WHERE id = NEW.to_subject_id;
      IF operation.terms->'owner' IS DISTINCT FROM jsonb_build_object('type', subject.kind, 'id', subject.id) OR
         operation.terms->'recipient' IS DISTINCT FROM jsonb_build_object('type', recipient.kind, 'id', recipient.id) OR NOT share_subject_active(subject.id) OR NOT share_subject_active(recipient.id) THEN
        RAISE EXCEPTION 'Transfer journal participants must match the actual active owner and accepted recipient';
      END IF;
      IF subject.kind = 'PLAYER' THEN
        IF subject.player_id <> NEW.actor_id OR NEW.decision_id IS NOT NULL OR NEW.state_directive_id IS NOT NULL THEN RAISE EXCEPTION 'A player transfers only their own shares'; END IF;
      ELSIF subject.kind = 'COMPANY' THEN
        SELECT * INTO STRICT decision FROM company_decisions WHERE id = NEW.decision_id;
        IF NEW.state_directive_id IS NOT NULL OR decision.company_id <> subject.id OR decision.payload->>'kind' IS DISTINCT FROM 'TRANSFER_OWNED_SHARES' OR decision.payload->'operation' IS DISTINCT FROM operation.terms OR
           (decision.payload->>'authorizationDecisionId')::uuid IS DISTINCT FROM NEW.authorization_decision_id THEN RAISE EXCEPTION 'Corporate disposal requires its exact owner decision'; END IF;
      ELSE
        SELECT * INTO STRICT directive FROM monetary_directives WHERE id = NEW.state_directive_id;
        IF NEW.decision_id IS NOT NULL OR directive.state_id <> subject.id OR directive.payload->>'kind' IS DISTINCT FROM 'TRANSFER_COMPANY_SHARES' OR directive.payload->'operation' IS DISTINCT FROM operation.terms OR
           (directive.payload->>'authorizationDecisionId')::uuid IS DISTINCT FROM NEW.authorization_decision_id THEN RAISE EXCEPTION 'State disposal requires its exact Governance decision'; END IF;
      END IF;
      SELECT * INTO STRICT charter FROM company_revisions WHERE id = company.current_revision_id;
      IF charter.content->'charter'->>'shareTransfers' = 'CORPORATE_APPROVAL' AND NEW.authorization_decision_id IS NULL THEN RAISE EXCEPTION 'Issuer charter requires its own transfer approval'; END IF;
      IF NEW.authorization_decision_id IS NOT NULL THEN
        SELECT * INTO STRICT decision FROM company_decisions WHERE id = NEW.authorization_decision_id;
        IF decision.company_id <> company.id OR decision.revision_id IS DISTINCT FROM company.current_revision_id OR decision.status <> 'APPLIED' OR decision.payload->>'kind' IS DISTINCT FROM 'AUTHORIZE_SHARE_TRANSFER' OR decision.payload->'operation' IS DISTINCT FROM operation.terms THEN RAISE EXCEPTION 'Issuer approval must bind the exact current transfer'; END IF;
      END IF;
    END IF;
  END IF;
  IF NEW.kind IN ('INITIAL','ISSUE') THEN UPDATE companies SET issued_shares = issued_shares + NEW.shares WHERE id = company.id; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION guard_share_acceptance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event company_share_events; consent company_share_consents; posting company_share_postings;
BEGIN
  SELECT * INTO STRICT event FROM company_share_events WHERE id = NEW.event_id;
  SELECT * INTO STRICT consent FROM company_share_consents WHERE id = NEW.consent_id;
  SELECT * INTO STRICT posting FROM company_share_postings WHERE event_id = event.id AND subject_id = NEW.subject_id;
  IF event.kind = 'INITIAL' OR event.database_transaction <> pg_current_xact_id()::text OR consent.operation_id IS DISTINCT FROM event.operation_id OR consent.subject_id <> NEW.subject_id OR posting.delta <= 0 OR
     EXISTS (SELECT 1 FROM company_share_consent_revocations WHERE consent_id = consent.id) THEN RAISE EXCEPTION 'Each receiving posting must consume its own exact unrevoked acquisition consent atomically'; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER share_acceptance_guard BEFORE INSERT ON company_share_acceptances FOR EACH ROW EXECUTE FUNCTION guard_share_acceptance();
--> statement-breakpoint
CREATE FUNCTION verify_share_acquisitions() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event company_share_events; expected integer;
BEGIN
  SELECT * INTO STRICT event FROM company_share_events WHERE id = NEW.id;
  IF event.kind = 'INITIAL' THEN RETURN NULL; END IF;
  SELECT count(*) INTO expected FROM company_share_postings WHERE event_id = event.id AND delta > 0;
  IF (SELECT count(*) FROM company_share_acceptances WHERE event_id = event.id) <> expected OR expected = 0 THEN RAISE EXCEPTION 'Every receiving share lot requires exactly one consumed acquisition consent'; END IF;
  IF EXISTS (SELECT 1 FROM company_share_acceptances a JOIN company_share_consent_revocations r ON r.consent_id = a.consent_id WHERE a.event_id = event.id) THEN RAISE EXCEPTION 'Revoked acquisition consent cannot complete ownership'; END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER share_acquisitions_complete AFTER INSERT ON company_share_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_share_acquisitions();

--> statement-breakpoint
CREATE OR REPLACE FUNCTION apply_company_share_posting() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event company_share_events; subject legal_subjects; allocations jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(741023);
  SELECT * INTO STRICT event FROM company_share_events WHERE id = NEW.event_id;
  SELECT * INTO STRICT subject FROM legal_subjects WHERE id = NEW.subject_id;
  IF event.company_id <> NEW.company_id OR event.database_transaction <> pg_current_xact_id()::text THEN
    RAISE EXCEPTION 'Cannot extend committed ownership or cross company identities';
  END IF;
  IF event.kind = 'TRANSFER' THEN
    IF NOT ((NEW.subject_id = event.from_subject_id AND NEW.delta = -event.shares) OR
            (NEW.subject_id = event.to_subject_id AND NEW.delta = event.shares)) THEN RAISE EXCEPTION 'Share transfer postings must match the exact approved participants'; END IF;
  ELSE
    IF event.kind = 'INITIAL' THEN SELECT a.allocations INTO STRICT allocations FROM company_registration_applications a WHERE id = event.application_id;
    ELSE SELECT o.terms->'allocations' INTO STRICT allocations FROM company_share_operations o WHERE id = event.operation_id; END IF;
    IF NEW.delta <= 0 OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(allocations) a
      WHERE a->'owner'->>'id' = NEW.subject_id::text AND a->'owner'->>'type' = subject.kind AND (a->>'shares')::numeric = NEW.delta) THEN
      RAISE EXCEPTION 'Share issuance must match each approved owner allocation';
    END IF;
  END IF;
  IF NEW.delta > 0 AND NOT share_subject_active(subject.id) THEN RAISE EXCEPTION 'Receiving ownership requires an active legal subject'; END IF;
  IF subject.kind = 'COMPANY' THEN
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = subject.company_id AND status = 'ACTIVE') THEN RAISE EXCEPTION 'Company shareholder must be active'; END IF;
    IF NEW.delta > 0 AND EXISTS (
      WITH RECURSIVE descendants(id) AS (
        SELECT NEW.company_id
        UNION
        SELECT b.company_id FROM company_share_balances b JOIN legal_subjects s ON s.id = b.subject_id
          JOIN descendants d ON d.id = s.company_id WHERE s.kind = 'COMPANY' AND b.shares > 0
      ) SELECT 1 FROM descendants WHERE id = subject.company_id
    ) THEN RAISE EXCEPTION 'Direct and indirect corporate ownership cycles are forbidden'; END IF;
  END IF;
  INSERT INTO company_share_balances(company_id, subject_id) VALUES (NEW.company_id, NEW.subject_id) ON CONFLICT DO NOTHING;
  UPDATE company_share_balances SET shares = shares + NEW.delta WHERE company_id = NEW.company_id AND subject_id = NEW.subject_id;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION verify_company_share_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event company_share_events; company companies; expected_count integer; allocations jsonb;
BEGIN
  SELECT * INTO STRICT event FROM company_share_events WHERE id = NEW.id;
  SELECT * INTO STRICT company FROM companies WHERE id = event.company_id;
  IF event.kind = 'TRANSFER' THEN expected_count := 2;
  ELSIF event.kind = 'INITIAL' THEN SELECT a.allocations INTO STRICT allocations FROM company_registration_applications a WHERE id = event.application_id; expected_count := jsonb_array_length(allocations);
  ELSE SELECT o.terms->'allocations' INTO STRICT allocations FROM company_share_operations o WHERE id = event.operation_id; expected_count := jsonb_array_length(allocations); END IF;
  IF (SELECT count(*) FROM company_share_postings WHERE event_id = event.id) <> expected_count OR
     (SELECT coalesce(sum(delta), 0) FROM company_share_postings WHERE event_id = event.id) <> (CASE WHEN event.kind = 'TRANSFER' THEN 0 ELSE event.shares END) OR
     (SELECT coalesce(sum(shares), 0) FROM company_share_balances WHERE company_id = company.id) <> company.issued_shares OR
     (SELECT coalesce(sum(shares), 0) FROM company_share_events WHERE company_id = company.id AND kind IN ('INITIAL','ISSUE')) <> company.issued_shares THEN
    RAISE EXCEPTION 'Ownership journal, balances and issued shares must reconcile exactly';
  END IF;
  IF event.decision_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM company_decisions WHERE id = event.decision_id AND status = 'APPLIED') OR
     event.authorization_decision_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM company_decisions WHERE id = event.authorization_decision_id AND status = 'APPLIED') OR
     event.state_directive_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM monetary_directives WHERE id = event.state_directive_id AND status = 'APPLIED') THEN
    RAISE EXCEPTION 'Ownership effects require completed source decisions';
  END IF;
  RETURN NULL;
END;
$$;
