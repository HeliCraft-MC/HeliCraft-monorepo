ALTER TABLE company_revisions ADD CONSTRAINT company_charter_source_decision FOREIGN KEY (decision_id) REFERENCES company_decisions(id);
--> statement-breakpoint
CREATE FUNCTION guard_company_charter_head() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE revision company_revisions; decision company_decisions;
BEGIN
  IF OLD.founded_at IS NULL OR NEW.current_revision_id IS NOT DISTINCT FROM OLD.current_revision_id THEN RETURN NEW; END IF;
  SELECT * INTO STRICT revision FROM company_revisions WHERE id = NEW.current_revision_id;
  SELECT * INTO STRICT decision FROM company_decisions WHERE id = revision.decision_id;
  IF revision.company_id <> NEW.id OR revision.database_transaction <> pg_current_xact_id()::text OR
     decision.company_id <> NEW.id OR decision.revision_id IS DISTINCT FROM OLD.current_revision_id OR
     decision.status NOT IN ('PENDING','APPLIED') THEN
    RAISE EXCEPTION 'A company charter head changes only through its new exact corporate decision';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_charter_head_guard BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION guard_company_charter_head();
--> statement-breakpoint
CREATE FUNCTION corporate_text_values(text_id uuid) RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(jsonb_object_agg(locale, value), '{}'::jsonb) FROM localized_text_values WHERE localized_text_values.text_id = $1;
$$;
--> statement-breakpoint
CREATE FUNCTION verify_company_charter_source() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE revision company_revisions; original company_revisions; source company_decisions; company companies;
        expected jsonb; expected_paths text[]; reference company_revision_texts; expected_text_id uuid;
BEGIN
  SELECT * INTO STRICT revision FROM company_revisions WHERE id = NEW.id;
  SELECT * INTO STRICT company FROM companies WHERE id = revision.company_id;
  IF revision.decision_id IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM company_registration_applications a WHERE a.revision_id = revision.id AND a.company_id = company.id) THEN
      RAISE EXCEPTION 'An initial company charter requires its immutable registration application';
    END IF;
    RETURN NULL;
  END IF;
  SELECT * INTO STRICT source FROM company_decisions WHERE id = revision.decision_id;
  SELECT * INTO STRICT original FROM company_revisions WHERE id = source.revision_id;
  IF source.status <> 'APPLIED' OR source.company_id <> company.id OR original.company_id <> company.id OR
     source.applied_by IS DISTINCT FROM revision.actor_id OR revision.previous_revision_id IS DISTINCT FROM source.revision_id OR
     NOT EXISTS (SELECT 1 FROM company_revisions r WHERE r.id = company.current_revision_id AND r.company_id = company.id AND r.number >= revision.number) THEN
    RAISE EXCEPTION 'A published charter requires its completed pinned corporate decision and head history';
  END IF;
  CASE source.payload->>'kind'
    WHEN 'AMEND_CHARTER' THEN expected := source.payload->'content';
    WHEN 'UPDATE_PROFILE' THEN expected := original.content || jsonb_build_object('name', source.payload->'name', 'description', source.payload->'description', 'categories', source.payload->'categories');
    WHEN 'CREATE_OFFICE' THEN
      IF EXISTS (SELECT 1 FROM jsonb_array_elements(original.content->'charter'->'offices') o WHERE o->>'id' = source.payload->'office'->>'id') THEN RAISE EXCEPTION 'A new office identity cannot replace an existing office'; END IF;
      expected := jsonb_set(original.content, '{charter,offices}', (original.content->'charter'->'offices') || jsonb_build_array(source.payload->'office'));
    WHEN 'UPDATE_OFFICE' THEN
      IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(original.content->'charter'->'offices') o WHERE o->>'id' = source.payload->'office'->>'id') THEN RAISE EXCEPTION 'An office amendment requires its existing identity'; END IF;
      expected := jsonb_set(original.content, '{charter,offices}', (SELECT jsonb_agg(CASE WHEN o->>'id' = source.payload->'office'->>'id' THEN source.payload->'office' ELSE o END ORDER BY position) FROM jsonb_array_elements(original.content->'charter'->'offices') WITH ORDINALITY AS office(o, position)));
    ELSE RAISE EXCEPTION 'This corporate decision cannot publish a charter revision';
  END CASE;
  IF revision.content IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Charter machine content must match the exact approved action'; END IF;
  SELECT array_agg(path ORDER BY path) INTO expected_paths FROM (
    SELECT d.path FROM company_decision_texts d WHERE d.decision_id = source.id
    UNION
    SELECT r.path FROM company_revision_texts r WHERE r.revision_id = original.id AND source.payload->>'kind' <> 'AMEND_CHARTER'
  ) paths;
  IF (SELECT array_agg(path ORDER BY path) FROM company_revision_texts WHERE revision_id = revision.id) IS DISTINCT FROM expected_paths THEN
    RAISE EXCEPTION 'Charter localized fields must match its approved action and unchanged previous fields';
  END IF;
  FOR reference IN SELECT * FROM company_revision_texts WHERE revision_id = revision.id LOOP
    SELECT d.text_id INTO expected_text_id FROM company_decision_texts d WHERE d.decision_id = source.id AND d.path = reference.path;
    IF expected_text_id IS NULL AND source.payload->>'kind' <> 'AMEND_CHARTER' THEN
      SELECT r.text_id INTO STRICT expected_text_id FROM company_revision_texts r WHERE r.revision_id = original.id AND r.path = reference.path;
    END IF;
    IF corporate_text_values(reference.text_id) IS DISTINCT FROM corporate_text_values(expected_text_id) THEN
      RAISE EXCEPTION 'Charter translations must preserve the exact approved localized values';
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER company_charter_source_complete AFTER INSERT ON company_revisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_company_charter_source();
--> statement-breakpoint
CREATE FUNCTION guard_company_completion_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'APPLIED' THEN
    IF NEW.applied_at IS NULL OR NEW.applied_by IS NULL OR (NEW.manual_reason IS NOT NULL AND btrim(NEW.manual_reason) = '') THEN
      RAISE EXCEPTION 'Completed corporate decisions retain their actual executor, time and any manual review reason';
    END IF;
  ELSIF NEW.applied_at IS NOT NULL OR NEW.applied_by IS NOT NULL OR NEW.manual_reason IS NOT NULL THEN
    RAISE EXCEPTION 'Pending or cancelled decisions cannot claim completed execution evidence';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER company_completion_evidence BEFORE INSERT OR UPDATE ON company_decisions FOR EACH ROW EXECUTE FUNCTION guard_company_completion_evidence();
