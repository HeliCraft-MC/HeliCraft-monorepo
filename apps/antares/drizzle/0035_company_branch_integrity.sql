ALTER TABLE company_branches ADD CONSTRAINT company_branch_current_application_scope FOREIGN KEY (current_application_id, id) REFERENCES company_branch_applications(id, branch_id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE company_branch_events ADD CONSTRAINT company_branch_event_application_scope FOREIGN KEY (application_id, branch_id) REFERENCES company_branch_applications(id, branch_id);
--> statement-breakpoint
CREATE UNIQUE INDEX company_branch_one_transition_per_transaction ON company_branch_events(branch_id, database_transaction);
--> statement-breakpoint
CREATE TRIGGER company_branch_no_delete BEFORE DELETE ON company_branches FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER company_branch_application_no_delete BEFORE DELETE ON company_branch_applications FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER company_branch_event_immutable BEFORE UPDATE OR DELETE ON company_branch_events FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE FUNCTION assert_company_branch_policy(company_id uuid, host_id uuid, policy_id uuid) RETURNS text LANGUAGE plpgsql AS $$
DECLARE owner companies; host states; policy company_registration_policy_revisions; latest_id uuid;
BEGIN
  SELECT * INTO STRICT owner FROM companies WHERE id = company_id;
  SELECT * INTO STRICT host FROM states WHERE id = host_id;
  SELECT * INTO STRICT policy FROM company_registration_policy_revisions WHERE id = policy_id;
  SELECT id INTO latest_id FROM company_registration_policy_revisions WHERE state_id = host_id ORDER BY number DESC LIMIT 1;
  IF owner.status <> 'ACTIVE' OR host.status <> 'ACTIVE' OR policy.state_id <> host.id OR policy.id IS DISTINCT FROM latest_id OR
     (policy.policy->>'branchMode' IN ('FREE','APPROVAL')) IS NOT TRUE OR
     (policy.policy->>'foreignBranches' = 'DENY' AND owner.registration_state_id IS DISTINCT FROM host.id) THEN
    RAISE EXCEPTION 'Branch registration requires active participants and the exact current permitted host policy';
  END IF;
  RETURN policy.policy->>'branchMode';
END;
$$;
--> statement-breakpoint
CREATE FUNCTION guard_company_branch_head() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source company_decisions; mode text; new_application boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(741023);
  new_application := TG_OP = 'INSERT';
  IF TG_OP = 'UPDATE' THEN
    new_application := NEW.current_application_id IS DISTINCT FROM OLD.current_application_id;
    IF (NEW.id, NEW.company_id, NEW.state_id, NEW.created_at) IS DISTINCT FROM (OLD.id, OLD.company_id, OLD.state_id, OLD.created_at) OR OLD.status = 'CLOSED' THEN
      RAISE EXCEPTION 'Branch identity, owner, jurisdiction and creation time are permanent';
    END IF;
    IF NEW.current_application_id IS DISTINCT FROM OLD.current_application_id THEN
      IF OLD.status NOT IN ('PENDING_REGISTRATION','REJECTED') THEN RAISE EXCEPTION 'Only pending or rejected branches may resubmit'; END IF;
    ELSIF NOT ((OLD.status = 'PENDING_REGISTRATION' AND NEW.status IN ('ACTIVE','REJECTED','CLOSED')) OR (OLD.status IN ('ACTIVE','REJECTED') AND NEW.status = 'CLOSED')) THEN
      RAISE EXCEPTION 'Unsupported branch transition or historical head rollback';
    END IF;
  ELSE
    NEW.created_at := clock_timestamp();
  END IF;
  IF new_application THEN
    SELECT * INTO STRICT source FROM company_decisions WHERE id = NEW.current_application_id;
    IF source.status <> 'PENDING' OR source.revision_id IS DISTINCT FROM (SELECT current_revision_id FROM companies WHERE id = NEW.company_id) OR source.company_id <> NEW.company_id OR source.payload->>'kind' IS DISTINCT FROM 'REGISTER_BRANCH' OR
       source.payload->>'branchId' IS DISTINCT FROM NEW.id::text OR source.payload->>'stateId' IS DISTINCT FROM NEW.state_id::text THEN
      RAISE EXCEPTION 'A branch registration must bind its actual owner decision and exact jurisdiction';
    END IF;
    mode := assert_company_branch_policy(NEW.company_id, NEW.state_id, (source.payload->>'policyRevisionId')::uuid);
    IF NEW.status IS DISTINCT FROM (CASE WHEN mode = 'FREE' THEN 'ACTIVE' ELSE 'PENDING_REGISTRATION' END) THEN RAISE EXCEPTION 'Branch state must follow its approved host policy'; END IF;
  END IF;
  NEW.database_transaction := pg_current_xact_id()::text;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_branch_head_guard BEFORE INSERT OR UPDATE ON company_branches FOR EACH ROW EXECUTE FUNCTION guard_company_branch_head();
--> statement-breakpoint
CREATE FUNCTION guard_company_branch_application() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(741023);
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('PENDING','APPROVED') OR num_nonnulls(NEW.review_directive_id,NEW.completion_decision_id,NEW.reviewed_by,NEW.review_reason,NEW.reviewed_at) <> 0 THEN RAISE EXCEPTION 'A new branch application has no fabricated review evidence'; END IF;
    NEW.created_at := clock_timestamp();
    NEW.database_transaction := pg_current_xact_id()::text;
  ELSE
    IF (NEW.id,NEW.branch_id,NEW.policy_revision_id,NEW.created_at,NEW.database_transaction) IS DISTINCT FROM (OLD.id,OLD.branch_id,OLD.policy_revision_id,OLD.created_at,OLD.database_transaction) OR OLD.status <> 'PENDING' OR NEW.status = 'PENDING' THEN
      RAISE EXCEPTION 'Branch application terms and completed outcomes are immutable';
    END IF;
    IF NEW.status IN ('APPROVED','REJECTED') THEN
      IF NEW.completion_decision_id IS NOT NULL OR NEW.review_directive_id IS NULL OR NEW.reviewed_by IS NULL OR NEW.review_reason IS NULL OR btrim(NEW.review_reason) = '' THEN RAISE EXCEPTION 'Host review retains its exact completed state decision and executor'; END IF;
      NEW.reviewed_at := clock_timestamp();
    ELSIF NEW.completion_decision_id IS NULL OR num_nonnulls(NEW.review_directive_id,NEW.reviewed_by,NEW.review_reason,NEW.reviewed_at) <> 0 THEN
      RAISE EXCEPTION 'Replacement or cancellation requires its exact corporate source';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_branch_application_guard BEFORE INSERT OR UPDATE ON company_branch_applications FOR EACH ROW EXECUTE FUNCTION guard_company_branch_application();
--> statement-breakpoint
CREATE FUNCTION verify_company_branch_application() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE application company_branch_applications; branch company_branches; source company_decisions; completion company_decisions; review monetary_directives; mode text;
BEGIN
  SELECT * INTO STRICT application FROM company_branch_applications WHERE id = NEW.id;
  SELECT * INTO STRICT branch FROM company_branches WHERE id = application.branch_id;
  SELECT * INTO STRICT source FROM company_decisions WHERE id = application.id;
  IF source.status <> 'APPLIED' OR source.company_id <> branch.company_id OR source.payload->>'kind' IS DISTINCT FROM 'REGISTER_BRANCH' OR
     source.payload->>'branchId' IS DISTINCT FROM branch.id::text OR source.payload->>'stateId' IS DISTINCT FROM branch.state_id::text OR
     source.payload->>'policyRevisionId' IS DISTINCT FROM application.policy_revision_id::text OR
     NOT EXISTS (SELECT 1 FROM company_registration_policy_revisions WHERE id = application.policy_revision_id AND state_id = branch.state_id) THEN
    RAISE EXCEPTION 'Branch application requires its exact completed corporate registration decision and scoped policy';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM company_decision_texts t JOIN localized_text_values v ON v.text_id = t.text_id WHERE t.decision_id = source.id AND t.path = 'name' AND btrim(v.value) <> '') THEN RAISE EXCEPTION 'Branch names must use the immutable normalized decision content'; END IF;
  IF TG_OP = 'INSERT' THEN
    mode := assert_company_branch_policy(branch.company_id, branch.state_id, application.policy_revision_id);
    IF application.status IN ('PENDING','APPROVED') AND (application.status = 'APPROVED') IS DISTINCT FROM (mode = 'FREE') THEN RAISE EXCEPTION 'Initial branch outcome must match the host approval requirement'; END IF;
  END IF;
  IF application.review_directive_id IS NOT NULL THEN
    SELECT * INTO STRICT review FROM monetary_directives WHERE id = application.review_directive_id;
    IF review.status <> 'APPLIED' OR review.state_id <> branch.state_id OR review.payload->>'kind' IS DISTINCT FROM 'REVIEW_COMPANY_BRANCH' OR
       review.payload->>'applicationId' IS DISTINCT FROM application.id::text OR review.payload->>'branchId' IS DISTINCT FROM branch.id::text OR
       review.payload->>'decision' IS DISTINCT FROM (CASE WHEN application.status = 'APPROVED' THEN 'APPROVE' ELSE 'REJECT' END) OR
       review.payload->>'reason' IS DISTINCT FROM application.review_reason THEN RAISE EXCEPTION 'Branch review must bind the actual host Governance and exact recorded outcome'; END IF;
    IF application.status = 'APPROVED' THEN
      mode := assert_company_branch_policy(branch.company_id, branch.state_id, application.policy_revision_id);
      IF mode <> 'APPROVAL' OR source.revision_id IS DISTINCT FROM (SELECT current_revision_id FROM companies WHERE id = branch.company_id) THEN RAISE EXCEPTION 'Host approval requires the current corporate charter and registration policy'; END IF;
    END IF;
  ELSIF application.status = 'REJECTED' THEN RAISE EXCEPTION 'A rejected branch application requires its host decision';
  END IF;
  IF application.completion_decision_id IS NOT NULL THEN
    SELECT * INTO STRICT completion FROM company_decisions WHERE id = application.completion_decision_id;
    IF completion.status <> 'APPLIED' OR completion.company_id <> branch.company_id OR completion.payload->>'branchId' IS DISTINCT FROM branch.id::text OR
       NOT ((application.status = 'SUPERSEDED' AND completion.payload->>'kind' = 'REGISTER_BRANCH' AND branch.current_application_id = completion.id) OR
            (application.status = 'CANCELLED' AND completion.payload->>'kind' = 'CLOSE_BRANCH' AND branch.status = 'CLOSED')) THEN RAISE EXCEPTION 'Branch replacement or cancellation requires its exact completed owner decision'; END IF;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER company_branch_application_complete AFTER INSERT OR UPDATE ON company_branch_applications DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_company_branch_application();
--> statement-breakpoint
CREATE FUNCTION guard_company_branch_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE branch company_branches; source company_decisions; review monetary_directives;
BEGIN
  PERFORM pg_advisory_xact_lock(741023);
  SELECT * INTO STRICT branch FROM company_branches WHERE id = NEW.branch_id;
  IF branch.database_transaction <> pg_current_xact_id()::text OR NEW.database_transaction <> branch.database_transaction OR NEW.application_id <> branch.current_application_id OR NEW.to_status <> branch.status THEN
    RAISE EXCEPTION 'A branch event must accompany the exact new atomic head transition';
  END IF;
  IF NEW.company_decision_id IS NOT NULL THEN
    SELECT * INTO STRICT source FROM company_decisions WHERE id = NEW.company_decision_id;
    IF source.status <> 'PENDING' OR source.company_id <> branch.company_id OR source.revision_id IS DISTINCT FROM (SELECT current_revision_id FROM companies WHERE id = branch.company_id) THEN RAISE EXCEPTION 'A branch effect belongs to the new current corporate execution transaction'; END IF;
  ELSE
    SELECT * INTO STRICT review FROM monetary_directives WHERE id = NEW.state_directive_id;
    IF review.status <> 'PENDING' OR review.state_id <> branch.state_id THEN RAISE EXCEPTION 'A branch review belongs to its new executing host decision'; END IF;
  END IF;
  NEW.created_at := clock_timestamp();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_branch_event_guard BEFORE INSERT ON company_branch_events FOR EACH ROW EXECUTE FUNCTION guard_company_branch_event();
--> statement-breakpoint
CREATE FUNCTION verify_company_branch_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE branch company_branches; application company_branch_applications; source company_decisions; review monetary_directives;
BEGIN
  SELECT * INTO STRICT branch FROM company_branches WHERE id = NEW.branch_id;
  SELECT * INTO STRICT application FROM company_branch_applications WHERE id = NEW.application_id;
  IF NEW.company_decision_id IS NOT NULL THEN
    SELECT * INTO STRICT source FROM company_decisions WHERE id = NEW.company_decision_id;
    IF source.status <> 'APPLIED' OR source.company_id <> branch.company_id OR source.applied_by IS DISTINCT FROM NEW.actor_id OR source.payload->>'branchId' IS DISTINCT FROM branch.id::text THEN RAISE EXCEPTION 'Branch history requires the exact applied owner decision and actual executor'; END IF;
    IF source.payload->>'kind' = 'REGISTER_BRANCH' THEN
      IF application.id <> source.id OR NEW.to_status NOT IN ('PENDING_REGISTRATION','ACTIVE') THEN RAISE EXCEPTION 'Branch registration history requires its exact application'; END IF;
    ELSIF source.payload->>'kind' IS DISTINCT FROM 'CLOSE_BRANCH' OR NEW.to_status <> 'CLOSED' THEN RAISE EXCEPTION 'A branch close must retain its actual corporate closure decision'; END IF;
  ELSE
    SELECT * INTO STRICT review FROM monetary_directives WHERE id = NEW.state_directive_id;
    IF review.status <> 'APPLIED' OR review.state_id <> branch.state_id OR application.review_directive_id IS DISTINCT FROM review.id OR application.reviewed_by IS DISTINCT FROM NEW.actor_id OR NEW.from_status IS DISTINCT FROM 'PENDING_REGISTRATION' OR
       NEW.to_status IS DISTINCT FROM (CASE WHEN application.status = 'APPROVED' THEN 'ACTIVE' ELSE 'REJECTED' END) THEN RAISE EXCEPTION 'Branch host history must retain its actual completed review'; END IF;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER company_branch_event_complete AFTER INSERT ON company_branch_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_company_branch_event();
--> statement-breakpoint
CREATE FUNCTION verify_company_branch_head() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE application company_branch_applications; event company_branch_events; previous_status text;
BEGIN
  SELECT * INTO STRICT application FROM company_branch_applications WHERE id = NEW.current_application_id AND branch_id = NEW.id;
  IF TG_OP = 'UPDATE' THEN previous_status := OLD.status; END IF;
  SELECT * INTO STRICT event FROM company_branch_events WHERE branch_id = NEW.id AND database_transaction = NEW.database_transaction;
  IF event.from_status IS DISTINCT FROM previous_status OR event.to_status <> NEW.status OR event.application_id <> NEW.current_application_id OR
     NOT ((NEW.status = 'PENDING_REGISTRATION' AND application.status = 'PENDING') OR (NEW.status = 'ACTIVE' AND application.status = 'APPROVED') OR
          (NEW.status = 'REJECTED' AND application.status = 'REJECTED') OR (NEW.status = 'CLOSED' AND application.status IN ('APPROVED','REJECTED','CANCELLED'))) THEN RAISE EXCEPTION 'Branch heads require a matching immutable status event and real application outcome'; END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER company_branch_head_complete AFTER INSERT OR UPDATE ON company_branches DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_company_branch_head();
