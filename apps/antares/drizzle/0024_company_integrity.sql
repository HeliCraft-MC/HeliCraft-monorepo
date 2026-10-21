-- Corporate identity, submitted decisions and ownership history are permanent.
DO $$
DECLARE relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'legal_subjects', 'company_revisions', 'company_revision_texts', 'company_offices',
    'company_registration_policy_revisions', 'company_formation_consents', 'company_consent_revocations',
    'company_status_history', 'company_decision_texts', 'company_decision_approvals',
    'company_approval_revocations', 'company_decision_votes', 'company_share_events', 'company_share_postings'
  ] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation()', relation_name || '_history', relation_name);
  END LOOP;
END;
$$;
--> statement-breakpoint
ALTER TABLE companies ADD CONSTRAINT company_current_revision_scope FOREIGN KEY (current_revision_id, id) REFERENCES company_revisions(id, company_id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE companies ADD CONSTRAINT company_current_application_scope FOREIGN KEY (current_application_id, id) REFERENCES company_registration_applications(id, company_id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE company_revisions ADD CONSTRAINT company_previous_revision_scope FOREIGN KEY (previous_revision_id, company_id) REFERENCES company_revisions(id, company_id);
--> statement-breakpoint
ALTER TABLE company_registration_applications ADD CONSTRAINT company_application_revision_scope FOREIGN KEY (revision_id, company_id) REFERENCES company_revisions(id, company_id);
--> statement-breakpoint
ALTER TABLE company_drafts ADD CONSTRAINT company_draft_application_scope FOREIGN KEY (submitted_application_id, company_id) REFERENCES company_registration_applications(id, company_id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE company_formation_consents ADD CONSTRAINT company_consent_source_decision FOREIGN KEY (company_decision_id) REFERENCES company_decisions(id);
--> statement-breakpoint
ALTER TABLE company_decisions ADD CONSTRAINT company_decision_revision_scope FOREIGN KEY (revision_id, company_id) REFERENCES company_revisions(id, company_id);
--> statement-breakpoint
ALTER TABLE company_share_postings ADD CONSTRAINT company_share_posting_event_scope FOREIGN KEY (event_id, company_id) REFERENCES company_share_events(id, company_id);
--> statement-breakpoint
CREATE FUNCTION guard_company_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Company identity and history cannot be deleted'; END IF;
  IF ROW(NEW.id, NEW.created_by, NEW.created_at) IS DISTINCT FROM ROW(OLD.id, OLD.created_by, OLD.created_at) OR
     (OLD.founded_at IS NOT NULL AND ROW(NEW.registration_state_id, NEW.founded_at) IS DISTINCT FROM ROW(OLD.registration_state_id, OLD.founded_at)) THEN
    RAISE EXCEPTION 'Company legal identity is immutable';
  END IF;
  IF NEW.issued_shares <> OLD.issued_shares AND pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'Issued shares may only change through the ownership journal';
  END IF;
  IF NEW.status = 'CLOSED' AND (NEW.issued_shares <> 0 OR EXISTS (SELECT 1 FROM company_share_balances WHERE subject_id = NEW.id AND shares > 0) OR
     EXISTS (SELECT 1 FROM financial_accounts WHERE kind = 'COMPANY' AND owner_id = NEW.id AND balance_minor <> 0)) THEN
    RAISE EXCEPTION 'Closure requires future capital retirement and liquidation procedures';
  END IF;
  IF OLD.status = 'CLOSED' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Closed company is immutable'; END IF;
  IF NEW.status <> OLD.status AND NOT (
    (OLD.status = 'DRAFT' AND NEW.status IN ('PENDING_REGISTRATION','CLOSED')) OR
    (OLD.status = 'PENDING_REGISTRATION' AND NEW.status IN ('ACTIVE','REJECTED')) OR
    (OLD.status = 'REJECTED' AND NEW.status IN ('PENDING_REGISTRATION','CLOSED')) OR
    (OLD.status = 'ACTIVE' AND NEW.status IN ('SUSPENDED','CLOSED')) OR
    (OLD.status = 'SUSPENDED' AND NEW.status IN ('ACTIVE','CLOSED'))
  ) THEN RAISE EXCEPTION 'Invalid company lifecycle transition'; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_identity_guard BEFORE UPDATE OR DELETE ON companies FOR EACH ROW EXECUTE FUNCTION guard_company_identity();
--> statement-breakpoint
CREATE FUNCTION guard_company_draft() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE company companies;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Company drafts use soft deletion'; END IF;
  SELECT * INTO STRICT company FROM companies WHERE id = NEW.company_id;
  IF NEW.owner_id <> company.created_by THEN RAISE EXCEPTION 'Creation draft must belong to the applicant'; END IF;
  IF TG_OP = 'INSERT' AND (company.founded_at IS NOT NULL OR company.status NOT IN ('DRAFT','REJECTED')) THEN
    RAISE EXCEPTION 'New registration drafts require an unfounded or rejected company';
  END IF;
  IF TG_OP = 'UPDATE' AND (ROW(NEW.id, NEW.company_id, NEW.owner_id) IS DISTINCT FROM ROW(OLD.id, OLD.company_id, OLD.owner_id) OR
      ((OLD.submitted_application_id IS NOT NULL OR OLD.deleted_at IS NOT NULL) AND NEW IS DISTINCT FROM OLD)) THEN
    RAISE EXCEPTION 'Submitted or deleted company drafts are immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_draft_guard BEFORE INSERT OR UPDATE OR DELETE ON company_drafts FOR EACH ROW EXECUTE FUNCTION guard_company_draft();
--> statement-breakpoint
CREATE FUNCTION number_company_status_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous company_status_history;
BEGIN
  PERFORM 1 FROM companies WHERE id = NEW.company_id FOR UPDATE;
  SELECT * INTO previous FROM company_status_history WHERE company_id = NEW.company_id ORDER BY number DESC LIMIT 1;
  IF NEW.previous_status IS DISTINCT FROM coalesce(previous.status, 'DRAFT') OR NEW.status = NEW.previous_status THEN
    RAISE EXCEPTION 'Company status history must extend the actual preceding lifecycle state';
  END IF;
  NEW.number := coalesce(previous.number, 0) + 1;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_status_sequence BEFORE INSERT ON company_status_history FOR EACH ROW EXECUTE FUNCTION number_company_status_history();
--> statement-breakpoint
CREATE FUNCTION guard_company_revision_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous company_revisions;
BEGIN
  PERFORM 1 FROM companies WHERE id = NEW.company_id FOR UPDATE;
  SELECT * INTO previous FROM company_revisions WHERE company_id = NEW.company_id ORDER BY number DESC LIMIT 1;
  IF NEW.number <> coalesce(previous.number, 0) + 1 OR NEW.previous_revision_id IS DISTINCT FROM previous.id OR
     NEW.database_transaction <> pg_current_xact_id()::text THEN RAISE EXCEPTION 'Company revision must extend its immutable history'; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_revision_insert_guard BEFORE INSERT ON company_revisions FOR EACH ROW EXECUTE FUNCTION guard_company_revision_insert();
--> statement-breakpoint
CREATE FUNCTION guard_company_text_append() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_transaction text;
BEGIN
  IF TG_TABLE_NAME = 'company_revision_texts' THEN
    SELECT database_transaction INTO STRICT owner_transaction FROM company_revisions WHERE id = NEW.revision_id;
  ELSE
    SELECT database_transaction INTO STRICT owner_transaction FROM company_decisions WHERE id = NEW.decision_id;
  END IF;
  IF owner_transaction <> pg_current_xact_id()::text THEN RAISE EXCEPTION 'Cannot extend committed corporate documents'; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_revision_text_append BEFORE INSERT ON company_revision_texts FOR EACH ROW EXECUTE FUNCTION guard_company_text_append();
--> statement-breakpoint
CREATE TRIGGER company_decision_text_append BEFORE INSERT ON company_decision_texts FOR EACH ROW EXECUTE FUNCTION guard_company_text_append();
--> statement-breakpoint
CREATE FUNCTION guard_company_translation_append() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM company_revision_texts t JOIN company_revisions r ON r.id = t.revision_id
      WHERE t.text_id = NEW.text_id AND r.database_transaction <> pg_current_xact_id()::text) OR
     EXISTS (SELECT 1 FROM company_decision_texts t JOIN company_decisions d ON d.id = t.decision_id
      WHERE t.text_id = NEW.text_id AND d.database_transaction <> pg_current_xact_id()::text) THEN
    RAISE EXCEPTION 'Published corporate translations are immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_translation_append BEFORE INSERT ON localized_text_values FOR EACH ROW EXECUTE FUNCTION guard_company_translation_append();
--> statement-breakpoint
CREATE FUNCTION guard_company_policy_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous company_registration_policy_revisions;
BEGIN
  PERFORM 1 FROM states WHERE id = NEW.state_id FOR UPDATE;
  SELECT * INTO previous FROM company_registration_policy_revisions WHERE state_id = NEW.state_id ORDER BY number DESC LIMIT 1;
  IF NEW.number <> coalesce(previous.number, 0) + 1 OR NEW.previous_revision_id IS DISTINCT FROM previous.id THEN
    RAISE EXCEPTION 'Registration policy must extend its state history';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_policy_insert_guard BEFORE INSERT ON company_registration_policy_revisions FOR EACH ROW EXECUTE FUNCTION guard_company_policy_insert();
--> statement-breakpoint
CREATE FUNCTION verify_company_policy() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE directive monetary_directives;
BEGIN
  SELECT * INTO STRICT directive FROM monetary_directives WHERE id = NEW.directive_id;
  IF directive.status <> 'APPLIED' OR directive.state_id <> NEW.state_id OR directive.payload->>'kind' <> 'SET_COMPANY_REGISTRATION_POLICY' OR
     directive.payload->'policy' IS DISTINCT FROM NEW.policy OR
     (directive.payload->>'baseRevisionId')::uuid IS DISTINCT FROM NEW.previous_revision_id THEN
    RAISE EXCEPTION 'Registration policy requires its exact applied state decision';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER company_policy_complete AFTER INSERT ON company_registration_policy_revisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_company_policy();
--> statement-breakpoint
CREATE FUNCTION guard_company_application_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Company registration history is permanent'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','review_directive_id','reviewed_at']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','review_directive_id','reviewed_at']) OR
     (OLD.status <> 'PENDING' AND NEW IS DISTINCT FROM OLD) OR
     (NEW.status <> OLD.status AND NEW.status NOT IN ('APPROVED','REJECTED')) THEN
    RAISE EXCEPTION 'Company registration payload and completed review are immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_application_update_guard BEFORE UPDATE OR DELETE ON company_registration_applications FOR EACH ROW EXECUTE FUNCTION guard_company_application_update();
--> statement-breakpoint
CREATE FUNCTION verify_company_consent() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE subject legal_subjects; directive monetary_directives; decision company_decisions;
BEGIN
  SELECT * INTO STRICT subject FROM legal_subjects WHERE id = NEW.subject_id;
  IF subject.kind = 'PLAYER' THEN
    IF NEW.actor_id <> subject.player_id OR NEW.company_decision_id IS NOT NULL OR NEW.state_directive_id IS NOT NULL THEN
      RAISE EXCEPTION 'Personal formation consent must be given by that player';
    END IF;
  ELSIF NEW.role <> 'FOUNDER' THEN RAISE EXCEPTION 'Corporate offices may only be held by players';
  ELSIF subject.kind = 'STATE' THEN
    SELECT * INTO STRICT directive FROM monetary_directives WHERE id = NEW.state_directive_id;
    IF NEW.company_decision_id IS NOT NULL OR directive.state_id <> subject.state_id OR directive.created_by <> NEW.actor_id OR directive.status <> 'APPLIED' OR
       directive.payload->>'kind' <> 'CONSENT_COMPANY_FORMATION' OR directive.payload->>'companyId' <> NEW.company_id::text OR
       directive.payload->>'formationHash' <> NEW.formation_hash THEN RAISE EXCEPTION 'State founding consent requires its exact applied Governance decision'; END IF;
  ELSE
    SELECT * INTO STRICT decision FROM company_decisions WHERE id = NEW.company_decision_id;
    IF NEW.state_directive_id IS NOT NULL OR decision.company_id <> subject.company_id OR decision.created_by <> NEW.actor_id OR decision.status <> 'APPLIED' OR
       decision.payload->>'kind' <> 'FOUND_COMPANY' OR decision.payload->>'companyId' <> NEW.company_id::text OR
       decision.payload->>'formationHash' <> NEW.formation_hash THEN RAISE EXCEPTION 'Corporate founding consent requires its exact applied decision'; END IF;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER company_consent_complete AFTER INSERT ON company_formation_consents DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_company_consent();
--> statement-breakpoint
CREATE FUNCTION guard_company_consent_revocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE consent company_formation_consents;
BEGIN
  SELECT * INTO STRICT consent FROM company_formation_consents WHERE id = NEW.consent_id;
  IF consent.actor_id <> NEW.actor_id OR consent.subject_id <> NEW.actor_id OR consent.company_decision_id IS NOT NULL OR consent.state_directive_id IS NOT NULL OR
     EXISTS (SELECT 1 FROM companies WHERE id = consent.company_id AND founded_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Only a personal uncompleted consent can be revoked by its signer';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_consent_revocation_guard BEFORE INSERT ON company_consent_revocations FOR EACH ROW EXECUTE FUNCTION guard_company_consent_revocation();
--> statement-breakpoint
CREATE FUNCTION company_holder_term_current(holder_id uuid) RETURNS boolean LANGUAGE sql VOLATILE AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_office_holders h JOIN company_revisions r ON r.id = h.revision_id
    CROSS JOIN LATERAL jsonb_array_elements(r.content->'charter'->'offices') office
    WHERE h.id = holder_id AND office->>'id' = h.office_id::text AND h.until IS NULL AND h.since <= clock_timestamp()
      AND (office->>'termDays' IS NULL OR h.since + make_interval(days => (office->>'termDays')::integer) > clock_timestamp())
  );
$$;
--> statement-breakpoint
CREATE FUNCTION guard_company_holder() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE office company_offices; company companies; revision company_revisions; definition jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Company appointment history is permanent'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - 'until') IS DISTINCT FROM (to_jsonb(OLD) - 'until') OR OLD.until IS NOT NULL OR NEW.until IS NULL THEN
      RAISE EXCEPTION 'A company appointment can only be ended once';
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO STRICT office FROM company_offices WHERE id = NEW.office_id;
  SELECT * INTO STRICT company FROM companies WHERE id = office.company_id FOR UPDATE;
  SELECT * INTO STRICT revision FROM company_revisions WHERE id = NEW.revision_id;
  SELECT value INTO STRICT definition FROM jsonb_array_elements(revision.content->'charter'->'offices') WHERE value->>'id' = NEW.office_id::text;
  IF company.status <> 'ACTIVE' OR revision.company_id <> office.company_id OR company.current_revision_id <> NEW.revision_id OR NEW.until IS NOT NULL OR
     (SELECT count(*) FROM company_office_holders h WHERE h.office_id = NEW.office_id AND company_holder_term_current(h.id)) >= (definition->>'maxHolders')::integer THEN
    RAISE EXCEPTION 'Company appointment must fit the current office and its capacity';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_holder_guard BEFORE INSERT OR UPDATE OR DELETE ON company_office_holders FOR EACH ROW EXECUTE FUNCTION guard_company_holder();
--> statement-breakpoint
CREATE FUNCTION guard_company_decision_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Company decisions are permanent'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','applied_at','applied_by','manual_reason']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','applied_at','applied_by','manual_reason']) OR
     (OLD.status <> 'PENDING' AND NEW IS DISTINCT FROM OLD) OR
     (NEW.status <> OLD.status AND NEW.status NOT IN ('APPLIED','CANCELLED')) THEN
    RAISE EXCEPTION 'Company decision payload and completed evidence are immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_decision_guard BEFORE UPDATE OR DELETE ON company_decisions FOR EACH ROW EXECUTE FUNCTION guard_company_decision_update();
--> statement-breakpoint
CREATE FUNCTION guard_company_approval_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE decision company_decisions; holder company_office_holders; office company_offices;
BEGIN
  SELECT * INTO STRICT decision FROM company_decisions WHERE id = NEW.decision_id;
  SELECT * INTO STRICT holder FROM company_office_holders WHERE id = NEW.holder_id;
  SELECT * INTO STRICT office FROM company_offices WHERE id = NEW.office_id;
  IF decision.status <> 'PENDING' OR office.company_id <> decision.company_id OR holder.office_id <> NEW.office_id OR holder.user_id <> NEW.actor_id OR
     NOT company_holder_term_current(holder.id) OR holder.since > NEW.approved_at THEN RAISE EXCEPTION 'Corporate signature requires the exact current uninterrupted office term'; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_approval_insert_guard BEFORE INSERT ON company_decision_approvals FOR EACH ROW EXECUTE FUNCTION guard_company_approval_insert();
--> statement-breakpoint
CREATE FUNCTION guard_company_approval_revocation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM company_decision_approvals a JOIN company_decisions d ON d.id = a.decision_id
    WHERE a.id = NEW.approval_id AND a.actor_id = NEW.actor_id AND d.status = 'PENDING') THEN
    RAISE EXCEPTION 'Only the signer may revoke a pending corporate signature';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_approval_revocation_guard BEFORE INSERT ON company_approval_revocations FOR EACH ROW EXECUTE FUNCTION guard_company_approval_revocation();
--> statement-breakpoint
CREATE FUNCTION guard_company_share_balance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' OR pg_trigger_depth() < 2 OR
    (TG_OP = 'INSERT' AND NEW.shares <> 0) THEN RAISE EXCEPTION 'Share balances derive only from ownership postings'; END IF;
  IF TG_OP = 'UPDATE' AND ROW(NEW.company_id, NEW.subject_id) IS DISTINCT FROM ROW(OLD.company_id, OLD.subject_id) THEN
    RAISE EXCEPTION 'Share balance identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_share_balance_guard BEFORE INSERT OR UPDATE OR DELETE ON company_share_balances FOR EACH ROW EXECUTE FUNCTION guard_company_share_balance();
--> statement-breakpoint
CREATE FUNCTION guard_company_share_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE company companies; application company_registration_applications; decision company_decisions;
        subject legal_subjects; recipient legal_subjects; directive monetary_directives; charter company_revisions;
BEGIN
  PERFORM pg_advisory_xact_lock(741023);
  SELECT * INTO STRICT company FROM companies WHERE id = NEW.company_id FOR UPDATE;
  IF company.status <> 'ACTIVE' OR NEW.database_transaction <> pg_current_xact_id()::text THEN
    RAISE EXCEPTION 'Ownership changes require an active company and a new atomic operation';
  END IF;
  IF NEW.kind = 'INITIAL' THEN
    SELECT * INTO STRICT application FROM company_registration_applications WHERE id = NEW.application_id;
    IF application.company_id <> NEW.company_id OR application.status <> 'APPROVED' OR application.total_shares <> NEW.shares OR company.issued_shares <> 0 OR
       EXISTS (SELECT 1 FROM company_share_events WHERE company_id = NEW.company_id AND kind = 'INITIAL') THEN
      RAISE EXCEPTION 'Initial shares require the exact approved registration';
    END IF;
  ELSIF NEW.kind = 'ISSUE' THEN
    SELECT * INTO STRICT decision FROM company_decisions WHERE id = NEW.decision_id;
    IF decision.company_id <> company.id OR decision.payload->>'kind' <> 'ISSUE_SHARES' OR (decision.payload->>'shares')::numeric <> NEW.shares THEN
      RAISE EXCEPTION 'Share issuance requires the exact corporate decision';
    END IF;
  ELSE
    SELECT * INTO STRICT subject FROM legal_subjects WHERE id = NEW.from_subject_id;
    SELECT * INTO STRICT recipient FROM legal_subjects WHERE id = NEW.to_subject_id;
    IF subject.kind = 'PLAYER' THEN
      IF subject.player_id <> NEW.actor_id OR NEW.decision_id IS NOT NULL OR NEW.state_directive_id IS NOT NULL THEN RAISE EXCEPTION 'A player may only transfer their own shares'; END IF;
    ELSIF subject.kind = 'COMPANY' THEN
      SELECT * INTO STRICT decision FROM company_decisions WHERE id = NEW.decision_id;
      IF NEW.state_directive_id IS NOT NULL OR decision.company_id <> subject.company_id OR decision.payload->>'kind' <> 'TRANSFER_OWNED_SHARES' OR
         decision.payload->>'issuerId' <> company.id::text OR (decision.payload->>'shares')::numeric <> NEW.shares OR
         decision.payload->'recipient'->>'id' <> recipient.id::text OR decision.payload->'recipient'->>'type' <> recipient.kind THEN
        RAISE EXCEPTION 'Corporate share disposal requires its exact owner decision';
      END IF;
    ELSE
      SELECT * INTO STRICT directive FROM monetary_directives WHERE id = NEW.state_directive_id;
      IF NEW.decision_id IS NOT NULL OR directive.state_id <> subject.state_id OR directive.payload->>'kind' <> 'TRANSFER_COMPANY_SHARES' OR
         directive.payload->>'issuerId' <> company.id::text OR (directive.payload->>'shares')::numeric <> NEW.shares OR
         directive.payload->'recipient'->>'id' <> recipient.id::text OR directive.payload->'recipient'->>'type' <> recipient.kind THEN
        RAISE EXCEPTION 'State share disposal requires its exact Governance decision';
      END IF;
    END IF;
    SELECT * INTO STRICT charter FROM company_revisions WHERE id = company.current_revision_id;
    IF charter.content->'charter'->>'shareTransfers' = 'CORPORATE_APPROVAL' AND NEW.authorization_decision_id IS NULL THEN
      RAISE EXCEPTION 'The issuer charter requires corporate transfer approval';
    END IF;
    IF NEW.authorization_decision_id IS NOT NULL THEN
      SELECT * INTO STRICT decision FROM company_decisions WHERE id = NEW.authorization_decision_id;
      IF decision.company_id <> company.id OR decision.payload->>'kind' <> 'AUTHORIZE_SHARE_TRANSFER' OR
         decision.payload->>'issuerId' <> company.id::text OR (decision.payload->>'shares')::numeric <> NEW.shares OR
         decision.payload->'owner'->>'id' <> subject.id::text OR decision.payload->'owner'->>'type' <> subject.kind OR
         decision.payload->'recipient'->>'id' <> recipient.id::text OR decision.payload->'recipient'->>'type' <> recipient.kind THEN
        RAISE EXCEPTION 'Issuer approval must bind the exact owner, recipient and quantity';
      END IF;
    END IF;
  END IF;
  IF NEW.kind IN ('INITIAL','ISSUE') THEN UPDATE companies SET issued_shares = issued_shares + NEW.shares WHERE id = company.id; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_share_event_guard BEFORE INSERT ON company_share_events FOR EACH ROW EXECUTE FUNCTION guard_company_share_event();
--> statement-breakpoint
CREATE FUNCTION apply_company_share_posting() RETURNS trigger LANGUAGE plpgsql AS $$
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
    ELSE SELECT d.payload->'allocations' INTO STRICT allocations FROM company_decisions d WHERE id = event.decision_id; END IF;
    IF NEW.delta <= 0 OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(allocations) a
      WHERE a->'owner'->>'id' = NEW.subject_id::text AND a->'owner'->>'type' = subject.kind AND (a->>'shares')::numeric = NEW.delta) THEN
      RAISE EXCEPTION 'Share issuance must match each approved owner allocation';
    END IF;
  END IF;
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
CREATE TRIGGER company_share_posting_apply BEFORE INSERT ON company_share_postings FOR EACH ROW EXECUTE FUNCTION apply_company_share_posting();
--> statement-breakpoint
CREATE FUNCTION verify_company_share_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event company_share_events; company companies; expected_count integer; allocations jsonb;
BEGIN
  SELECT * INTO STRICT event FROM company_share_events WHERE id = NEW.id;
  SELECT * INTO STRICT company FROM companies WHERE id = event.company_id;
  IF event.kind = 'TRANSFER' THEN expected_count := 2;
  ELSIF event.kind = 'INITIAL' THEN SELECT a.allocations INTO STRICT allocations FROM company_registration_applications a WHERE id = event.application_id; expected_count := jsonb_array_length(allocations);
  ELSE SELECT d.payload->'allocations' INTO STRICT allocations FROM company_decisions d WHERE id = event.decision_id; expected_count := jsonb_array_length(allocations); END IF;
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
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER company_share_event_complete AFTER INSERT ON company_share_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_company_share_event();
--> statement-breakpoint
CREATE FUNCTION verify_company_application() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE application company_registration_applications; draft company_drafts; policy company_registration_policy_revisions;
        company companies; directive monetary_directives; allocation jsonb; office jsonb; holder jsonb;
BEGIN
  SELECT * INTO STRICT application FROM company_registration_applications WHERE id = NEW.id;
  SELECT * INTO STRICT draft FROM company_drafts WHERE id = application.draft_id;
  SELECT * INTO STRICT company FROM companies WHERE id = application.company_id;
  SELECT * INTO STRICT policy FROM company_registration_policy_revisions WHERE id = application.policy_revision_id;
  IF draft.company_id <> company.id OR draft.owner_id <> application.applicant_id OR company.created_by <> application.applicant_id OR
     draft.submitted_application_id IS DISTINCT FROM application.id OR policy.state_id <> application.state_id OR
     application.allocations IS DISTINCT FROM draft.configuration->'allocations' OR
     application.total_shares IS DISTINCT FROM (draft.configuration->>'totalShares')::numeric OR
     application.state_id::text IS DISTINCT FROM draft.configuration->>'registrationStateId' OR
     (SELECT coalesce(sum((a->>'shares')::numeric), 0) FROM jsonb_array_elements(application.allocations) a) <> application.total_shares THEN
    RAISE EXCEPTION 'Registration must retain its exact submitted draft, state policy and ownership';
  END IF;
  IF policy.policy->'registrationFee' <> 'null'::jsonb THEN
    IF NOT EXISTS (
      SELECT 1 FROM ledger_transactions j WHERE j.id = application.fee_journal_id AND j.kind = 'TRANSFER'
        AND j.actor_id = application.applicant_id AND j.currency_id::text = policy.policy->'registrationFee'->>'currencyId'
        AND j.amount_minor = (policy.policy->'registrationFee'->>'amountMinor')::numeric
        AND EXISTS (SELECT 1 FROM ledger_postings p JOIN financial_accounts a ON a.id = p.account_id
          WHERE p.transaction_id = j.id AND p.delta_minor = -j.amount_minor AND a.kind = 'PLAYER' AND a.owner_id = application.applicant_id)
        AND EXISTS (SELECT 1 FROM ledger_postings p JOIN financial_accounts a ON a.id = p.account_id
          WHERE p.transaction_id = j.id AND p.delta_minor = j.amount_minor AND a.kind = 'TREASURY' AND a.owner_id = application.state_id)
    ) THEN RAISE EXCEPTION 'Registration requires its exact approved application fee'; END IF;
  ELSIF application.fee_journal_id IS NOT NULL THEN RAISE EXCEPTION 'A fee-free policy cannot charge an application fee'; END IF;
  IF application.status IN ('APPROVED','REJECTED') THEN
    IF application.reviewed_at IS NULL THEN RAISE EXCEPTION 'A completed registration requires its review timestamp'; END IF;
    IF application.review_directive_id IS NULL THEN
      IF application.status <> 'APPROVED' OR policy.policy->>'companyMode' <> 'FREE' THEN RAISE EXCEPTION 'State approval cannot be bypassed'; END IF;
    ELSE
      SELECT * INTO STRICT directive FROM monetary_directives WHERE id = application.review_directive_id;
      IF directive.status <> 'APPLIED' OR directive.state_id <> application.state_id OR directive.payload->>'kind' <> 'REVIEW_COMPANY_REGISTRATION' OR
         directive.payload->>'applicationId' <> application.id::text OR directive.payload->>'formationHash' <> application.formation_hash OR
         directive.payload->>'decision' <> (CASE WHEN application.status = 'APPROVED' THEN 'APPROVE' ELSE 'REJECT' END) THEN
        RAISE EXCEPTION 'Registration review must bind the exact application and conditions';
      END IF;
    END IF;
  END IF;
  IF application.status = 'APPROVED' THEN
    FOR allocation IN SELECT value FROM jsonb_array_elements(application.allocations) LOOP
      IF NOT EXISTS (SELECT 1 FROM company_formation_consents c JOIN legal_subjects s ON s.id = c.subject_id
        WHERE c.company_id = company.id AND c.formation_hash = application.formation_hash AND c.role = 'FOUNDER'
          AND s.id::text = allocation->'owner'->>'id' AND s.kind = allocation->'owner'->>'type'
          AND NOT EXISTS (SELECT 1 FROM company_consent_revocations r WHERE r.consent_id = c.id)) THEN
        RAISE EXCEPTION 'Every initial owner must consent to this exact formation';
      END IF;
    END LOOP;
    FOR office IN SELECT value FROM company_revisions r CROSS JOIN LATERAL jsonb_array_elements(r.content->'charter'->'offices') WHERE r.id = application.revision_id LOOP
      FOR holder IN SELECT value FROM jsonb_array_elements(office->'initialHolderIds') LOOP
        IF NOT EXISTS (SELECT 1 FROM company_formation_consents c WHERE c.company_id = company.id AND c.formation_hash = application.formation_hash AND c.role = 'OFFICE_HOLDER'
          AND c.subject_id::text = holder#>>'{}' AND c.actor_id = c.subject_id
          AND NOT EXISTS (SELECT 1 FROM company_consent_revocations r WHERE r.consent_id = c.id)) THEN RAISE EXCEPTION 'Every initial officer must consent'; END IF;
      END LOOP;
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM company_share_events e WHERE e.application_id = application.id AND e.company_id = company.id AND e.kind = 'INITIAL' AND e.shares = application.total_shares) THEN
      RAISE EXCEPTION 'Activated registration requires its exact initial ownership journal';
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER company_application_complete AFTER INSERT OR UPDATE ON company_registration_applications DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_company_application();
--> statement-breakpoint
CREATE FUNCTION verify_company_head() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE company companies; latest_status text; target_company_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'companies' THEN target_company_id := NEW.id;
  ELSE target_company_id := NEW.company_id; END IF;
  SELECT * INTO STRICT company FROM companies WHERE id = target_company_id;
  SELECT status INTO latest_status FROM company_status_history WHERE company_id = company.id ORDER BY number DESC LIMIT 1;
  IF company.status <> 'DRAFT' AND latest_status IS DISTINCT FROM company.status THEN RAISE EXCEPTION 'Company lifecycle requires status history'; END IF;
  IF (SELECT coalesce(sum(shares), 0) FROM company_share_balances WHERE company_id = company.id) <> company.issued_shares OR
     (SELECT coalesce(sum(shares), 0) FROM company_share_events WHERE company_id = company.id AND kind IN ('INITIAL','ISSUE')) <> company.issued_shares THEN
    RAISE EXCEPTION 'Company capital must reconcile with immutable ownership history';
  END IF;
  IF company.status IN ('ACTIVE','SUSPENDED') AND (company.founded_at IS NULL OR company.current_revision_id IS NULL OR company.registration_state_id IS NULL OR company.issued_shares <= 0 OR
      NOT EXISTS (SELECT 1 FROM company_registration_applications a WHERE a.id = company.current_application_id AND a.company_id = company.id AND a.status = 'APPROVED')) THEN
    RAISE EXCEPTION 'Active legal identity requires approved registration, charter and issued ownership';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER company_head_complete AFTER INSERT OR UPDATE ON companies DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_company_head();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER company_status_head_complete AFTER INSERT ON company_status_history DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_company_head();
