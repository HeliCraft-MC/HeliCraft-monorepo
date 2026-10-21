-- A frozen voter is a player identity or one legal shareholder, never its representative.
ALTER TABLE voting_ballots ADD CONSTRAINT voting_ballot_company_source FOREIGN KEY (company_decision_id) REFERENCES company_decisions(id);
--> statement-breakpoint
ALTER TABLE voting_ballots ADD CONSTRAINT voting_ballot_state_source FOREIGN KEY (state_directive_id) REFERENCES monetary_directives(id);
--> statement-breakpoint
CREATE FUNCTION guard_frozen_voter() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE voting votings; company companies; position company_share_balances;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Frozen electorate identities and weights are immutable'; END IF;
  SELECT * INTO STRICT voting FROM votings WHERE id = NEW.voting_id;
  IF voting.configuration->'electorate'->>'type' IN ('COMPANY_SHAREHOLDERS','COMPANY_OFFICE_HOLDERS') THEN
    PERFORM pg_advisory_xact_lock(741022);
    PERFORM pg_advisory_xact_lock(741023);
  END IF;
  SELECT * INTO STRICT voting FROM votings WHERE id = NEW.voting_id FOR UPDATE;
  IF voting.status <> 'SCHEDULED' OR voting.snapshot_at IS NOT NULL THEN RAISE EXCEPTION 'Electorates are frozen exactly once when voting opens'; END IF;
  IF voting.configuration->'electorate'->>'type' = 'COMPANY_SHAREHOLDERS' THEN
    SELECT * INTO STRICT company FROM companies WHERE id::text = voting.configuration->'electorate'->>'companyId';
    SELECT * INTO STRICT position FROM company_share_balances WHERE company_id = company.id AND subject_id = NEW.subject_id;
    IF company.status <> 'ACTIVE' OR company.current_revision_id IS DISTINCT FROM voting.company_revision_id OR NEW.user_id IS NOT NULL OR
       NEW.subject_id IS NULL OR NEW.voter_id <> NEW.subject_id OR position.shares <= 0 OR NEW.weight <> position.shares THEN
      RAISE EXCEPTION 'Shareholder electorate must retain the exact opening ownership';
    END IF;
  ELSE
    IF NEW.subject_id IS NOT NULL OR NEW.user_id IS NULL OR NEW.voter_id <> NEW.user_id OR NEW.weight <> 1 THEN
      RAISE EXCEPTION 'Ordinary and office electorates count each player once';
    END IF;
    IF voting.configuration->'electorate'->>'type' = 'COMPANY_OFFICE_HOLDERS' AND NOT EXISTS (
      SELECT 1 FROM company_office_holders h JOIN company_offices o ON o.id = h.office_id JOIN companies c ON c.id = o.company_id
        JOIN users u ON u.id = h.user_id
      WHERE h.user_id = NEW.user_id AND o.company_id::text = voting.configuration->'electorate'->>'companyId'
        AND c.status = 'ACTIVE' AND c.current_revision_id = voting.company_revision_id AND u.status = 'ACTIVE'
        AND company_holder_term_current(h.id) AND voting.configuration->'electorate'->'officeIds' ? o.id::text
    ) THEN RAISE EXCEPTION 'Office electorate requires an actual current corporate appointment'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER frozen_voter_guard BEFORE INSERT OR UPDATE OR DELETE ON voting_eligible_voters FOR EACH ROW EXECUTE FUNCTION guard_frozen_voter();
--> statement-breakpoint
CREATE FUNCTION guard_corporate_voting() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE company companies; decision company_decisions; expected_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.configuration->'electorate'->>'type' IN ('COMPANY_SHAREHOLDERS','COMPANY_OFFICE_HOLDERS') THEN RAISE EXCEPTION 'Corporate voting history is permanent'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.configuration->'electorate'->>'type' IS DISTINCT FROM NEW.configuration->'electorate'->>'type' AND
     (OLD.configuration->'electorate'->>'type' IN ('COMPANY_SHAREHOLDERS','COMPANY_OFFICE_HOLDERS') OR
      NEW.configuration->'electorate'->>'type' IN ('COMPANY_SHAREHOLDERS','COMPANY_OFFICE_HOLDERS')) THEN
    RAISE EXCEPTION 'A voting cannot switch between corporate and ordinary identity contexts';
  END IF;
  IF OLD.configuration->'electorate'->>'type' IN ('COMPANY_SHAREHOLDERS','COMPANY_OFFICE_HOLDERS') AND OLD.status <> 'DRAFT' AND
     (to_jsonb(NEW) - ARRAY['status','snapshot_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','snapshot_at']) THEN
    RAISE EXCEPTION 'Published corporate voting terms and revision pins are immutable';
  END IF;
  IF NEW.configuration->'electorate'->>'type' NOT IN ('COMPANY_SHAREHOLDERS','COMPANY_OFFICE_HOLDERS') THEN
    IF NEW.company_revision_id IS NOT NULL THEN RAISE EXCEPTION 'Only corporate voting can pin a company charter'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.status = 'DRAFT' THEN RETURN NEW; END IF;
  SELECT * INTO STRICT company FROM companies WHERE id::text = NEW.configuration->'electorate'->>'companyId';
  SELECT * INTO STRICT decision FROM company_decisions WHERE id::text = NEW.subject->>'id';
  IF NEW.subject->>'type' IS DISTINCT FROM 'COMPANY_DECISION' OR NEW.subject->>'version' IS DISTINCT FROM '1' OR
     decision.company_id <> company.id OR decision.revision_id IS DISTINCT FROM NEW.company_revision_id OR NEW.governance_revision_id IS NOT NULL OR
     NOT EXISTS (SELECT 1 FROM company_decision_votes v WHERE v.voting_id = NEW.id AND v.decision_id = decision.id) THEN
    RAISE EXCEPTION 'Corporate voting requires its exact decision and charter binding';
  END IF;
  IF OLD.snapshot_at IS NOT NULL AND NEW.snapshot_at IS DISTINCT FROM OLD.snapshot_at THEN RAISE EXCEPTION 'Voting snapshot time is immutable'; END IF;
  IF OLD.snapshot_at IS NULL AND NEW.snapshot_at IS NOT NULL THEN
    IF OLD.status <> 'SCHEDULED' OR NEW.status NOT IN ('OPEN','CLOSED') OR company.status <> 'ACTIVE' OR company.current_revision_id <> NEW.company_revision_id THEN
      RAISE EXCEPTION 'Corporate electorate must open against the pinned active charter';
    END IF;
    IF NEW.configuration->'electorate'->>'type' = 'COMPANY_SHAREHOLDERS' THEN
      SELECT count(*) INTO expected_count FROM company_share_balances WHERE company_id = company.id AND shares > 0;
      IF (SELECT coalesce(sum(weight), 0) FROM voting_eligible_voters WHERE voting_id = NEW.id) <> company.issued_shares THEN
        RAISE EXCEPTION 'Every issued share must be represented once in the frozen electorate';
      END IF;
    ELSE
      SELECT count(DISTINCT h.user_id) INTO expected_count FROM company_office_holders h JOIN company_offices o ON o.id = h.office_id
        JOIN users u ON u.id = h.user_id WHERE o.company_id = company.id AND u.status = 'ACTIVE'
          AND company_holder_term_current(h.id) AND NEW.configuration->'electorate'->'officeIds' ? o.id::text;
    END IF;
    IF (SELECT count(*) FROM voting_eligible_voters WHERE voting_id = NEW.id) <> expected_count THEN RAISE EXCEPTION 'Frozen corporate electorate is incomplete'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER corporate_voting_guard BEFORE UPDATE OR DELETE ON votings FOR EACH ROW EXECUTE FUNCTION guard_corporate_voting();
--> statement-breakpoint
CREATE FUNCTION guard_voting_ballot() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE voting votings; voter voting_eligible_voters; subject legal_subjects;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT * INTO STRICT voting FROM votings WHERE id = OLD.voting_id;
    IF voting.configuration->'survey' IS NULL OR voting.configuration->'survey' = 'null'::jsonb THEN RAISE EXCEPTION 'Decision ballots are immutable'; END IF;
    IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'Survey responses can be removed, never rewritten'; END IF;
    RETURN OLD;
  END IF;
  SELECT * INTO STRICT voting FROM votings WHERE id = NEW.voting_id FOR UPDATE;
  SELECT * INTO STRICT voter FROM voting_eligible_voters WHERE voting_id = NEW.voting_id AND voter_id = NEW.voter_id;
  IF voting.status <> 'OPEN' OR voting.snapshot_at IS NULL OR voting.opens_at > clock_timestamp() OR
     ((voting.configuration->'survey'->>'manualClose')::boolean IS NOT TRUE AND voting.closes_at <= clock_timestamp()) OR
     NEW.database_transaction <> pg_current_xact_id()::text OR
     NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id AND status = 'ACTIVE') THEN RAISE EXCEPTION 'A ballot requires an open voting and an active actor'; END IF;
  IF voter.subject_id IS NULL THEN
    IF voter.user_id <> NEW.user_id OR NEW.company_decision_id IS NOT NULL OR NEW.state_directive_id IS NOT NULL THEN RAISE EXCEPTION 'Only this frozen player may cast the ballot'; END IF;
  ELSE
    SELECT * INTO STRICT subject FROM legal_subjects WHERE id = voter.subject_id;
    IF voting.configuration->'electorate'->>'type' <> 'COMPANY_SHAREHOLDERS' THEN RAISE EXCEPTION 'Legal subjects vote only as frozen shareholders'; END IF;
    IF subject.kind = 'PLAYER' THEN
      IF subject.player_id <> NEW.user_id OR NEW.company_decision_id IS NOT NULL OR NEW.state_directive_id IS NOT NULL THEN RAISE EXCEPTION 'A personal shareholder must vote for themselves'; END IF;
    ELSIF subject.kind = 'COMPANY' THEN
      IF NEW.company_decision_id IS NULL OR NEW.state_directive_id IS NOT NULL THEN RAISE EXCEPTION 'A corporate shareholder requires its own Governance decision'; END IF;
    ELSIF NEW.state_directive_id IS NULL OR NEW.company_decision_id IS NOT NULL THEN RAISE EXCEPTION 'A state shareholder requires its own Governance decision'; END IF;
  END IF;
  IF voting.configuration->'survey' IS NULL OR voting.configuration->'survey' = 'null'::jsonb THEN
    IF NEW.repeat_key IS NOT NULL OR NEW.answers IS NOT NULL THEN RAISE EXCEPTION 'Decision voting cannot accept repeat or survey ballots'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER voting_ballot_guard BEFORE INSERT OR UPDATE OR DELETE ON voting_ballots FOR EACH ROW EXECUTE FUNCTION guard_voting_ballot();
--> statement-breakpoint
CREATE FUNCTION verify_voting_entity_ballot() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_payload jsonb; source_status text; source_owner uuid; source_actor uuid; subject legal_subjects;
BEGIN
  IF NEW.company_decision_id IS NOT NULL THEN
    SELECT payload, status, company_id, applied_by INTO STRICT source_payload, source_status, source_owner, source_actor FROM company_decisions WHERE id = NEW.company_decision_id;
  ELSIF NEW.state_directive_id IS NOT NULL THEN
    SELECT payload, status, state_id, created_by INTO STRICT source_payload, source_status, source_owner, source_actor FROM monetary_directives WHERE id = NEW.state_directive_id;
  ELSE RETURN NULL; END IF;
  SELECT * INTO STRICT subject FROM legal_subjects WHERE id = NEW.voter_id;
  IF source_status <> 'APPLIED' OR source_owner <> subject.id OR
     (NEW.company_decision_id IS NOT NULL AND source_actor IS DISTINCT FROM NEW.user_id) OR
     source_payload->>'kind' <> 'VOTE_AS_SHAREHOLDER' OR source_payload->>'votingId' <> NEW.voting_id::text OR
     (source_payload->>'abstain')::boolean IS DISTINCT FROM NEW.abstain OR
     EXISTS ((SELECT jsonb_array_elements_text(source_payload->'choices')) EXCEPT
       (SELECT o.option_key::text FROM voting_ballot_choices c JOIN voting_options o ON o.id = c.option_id WHERE c.ballot_id = NEW.id)) OR
     EXISTS ((SELECT o.option_key::text FROM voting_ballot_choices c JOIN voting_options o ON o.id = c.option_id WHERE c.ballot_id = NEW.id) EXCEPT
       (SELECT jsonb_array_elements_text(source_payload->'choices'))) THEN
    RAISE EXCEPTION 'Entity ballot must match its exact completed owner decision';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER voting_entity_ballot_complete AFTER INSERT ON voting_ballots DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_voting_entity_ballot();
--> statement-breakpoint
CREATE FUNCTION guard_voting_choice() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ballot voting_ballots; option voting_options;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Submitted ballot choices are immutable'; END IF;
  SELECT * INTO STRICT ballot FROM voting_ballots WHERE id = NEW.ballot_id;
  SELECT * INTO STRICT option FROM voting_options WHERE id = NEW.option_id;
  IF option.voting_id <> ballot.voting_id OR ballot.database_transaction <> pg_current_xact_id()::text OR ballot.abstain THEN
    RAISE EXCEPTION 'Ballot choices must be submitted atomically for that voting';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER voting_choice_guard BEFORE INSERT OR UPDATE OR DELETE ON voting_ballot_choices FOR EACH ROW EXECUTE FUNCTION guard_voting_choice();
--> statement-breakpoint
CREATE FUNCTION verify_voting_ballot_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE voting votings; selected integer; question jsonb; question_selected integer;
BEGIN
  SELECT * INTO STRICT voting FROM votings WHERE id = NEW.voting_id;
  IF voting.configuration->'survey' IS NOT NULL AND voting.configuration->'survey' <> 'null'::jsonb THEN RETURN NULL; END IF;
  SELECT count(*) INTO selected FROM voting_ballot_choices WHERE ballot_id = NEW.id;
  IF NEW.abstain THEN
    IF selected <> 0 OR (voting.configuration->'rules'->>'allowAbstain')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'Abstention must be permitted and contain no choices'; END IF;
  ELSIF voting.configuration->'questions' IS NULL THEN
    IF selected < 1 OR selected > (voting.configuration->>'maxSelections')::integer THEN RAISE EXCEPTION 'Ballot selection count violates its pinned rules'; END IF;
  ELSE
    FOR question IN SELECT value FROM jsonb_array_elements(voting.configuration->'questions') LOOP
      SELECT count(*) INTO question_selected FROM voting_ballot_choices c JOIN voting_options o ON o.id = c.option_id
        WHERE c.ballot_id = NEW.id AND question->'optionIds' ? o.option_key::text;
      IF question_selected < 1 OR question_selected > (question->>'maxSelections')::integer THEN RAISE EXCEPTION 'Every voting question requires its permitted number of choices'; END IF;
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER voting_ballot_complete AFTER INSERT ON voting_ballots DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_voting_ballot_complete();
--> statement-breakpoint
CREATE FUNCTION guard_corporate_voting_field() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE voting votings; target_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN target_id := NEW.voting_id; ELSE target_id := OLD.voting_id; END IF;
  SELECT * INTO STRICT voting FROM votings WHERE id = target_id;
  IF voting.configuration->'electorate'->>'type' IN ('COMPANY_SHAREHOLDERS','COMPANY_OFFICE_HOLDERS') AND voting.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Published corporate voting options and questions are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER corporate_option_guard BEFORE INSERT OR UPDATE OR DELETE ON voting_options FOR EACH ROW EXECUTE FUNCTION guard_corporate_voting_field();
--> statement-breakpoint
CREATE TRIGGER corporate_question_guard BEFORE INSERT OR UPDATE OR DELETE ON voting_questions FOR EACH ROW EXECUTE FUNCTION guard_corporate_voting_field();
--> statement-breakpoint
CREATE FUNCTION guard_corporate_voting_translation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM votings v WHERE v.status <> 'DRAFT'
    AND v.configuration->'electorate'->>'type' IN ('COMPANY_SHAREHOLDERS','COMPANY_OFFICE_HOLDERS')
    AND (v.title_text_id = NEW.text_id OR v.description_text_id = NEW.text_id OR
      EXISTS (SELECT 1 FROM voting_options o WHERE o.voting_id = v.id AND o.label_text_id = NEW.text_id) OR
      EXISTS (SELECT 1 FROM voting_questions q WHERE q.voting_id = v.id AND q.title_text_id = NEW.text_id))) THEN
    RAISE EXCEPTION 'Published corporate voting translations are immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER corporate_voting_translation_guard BEFORE INSERT ON localized_text_values FOR EACH ROW EXECUTE FUNCTION guard_corporate_voting_translation();
