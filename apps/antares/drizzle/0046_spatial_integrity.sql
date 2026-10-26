-- Cartesian Minecraft X/Z only. SRID 0 deliberately has no geodetic meaning.
ALTER TABLE territory_drafts ADD CONSTRAINT territory_draft_base_fk FOREIGN KEY (base_revision_id) REFERENCES territory_revisions(id);
--> statement-breakpoint
ALTER TABLE territory_revisions ADD CONSTRAINT territory_revision_previous_fk FOREIGN KEY (previous_revision_id) REFERENCES territory_revisions(id);
--> statement-breakpoint
ALTER TABLE spatial_worlds ADD CONSTRAINT spatial_world_identifiers CHECK (
  logical_key ~ '^[a-z0-9][a-z0-9-]{0,63}$' AND backend_id ~ '^[a-zA-Z0-9_-]{1,64}$'
  AND tile_key ~ '^[a-z0-9_-]{1,96}$' AND version >= 0);
--> statement-breakpoint
ALTER TABLE territory_revisions ADD CONSTRAINT territory_revision_geometry_limits CHECK (
  geom IS NOT NULL AND ST_NDims(geom) = 2 AND ST_NumGeometries(geom) <= 32 AND ST_NRings(geom) <= 256
  AND octet_length(geometry::text) <= 524288
  AND ST_XMin(Box3D(geom)) >= -29999984 AND ST_XMax(Box3D(geom)) <= 29999984
  AND ST_YMin(Box3D(geom)) >= -29999984 AND ST_YMax(Box3D(geom)) <= 29999984);
--> statement-breakpoint
CREATE INDEX territory_revision_spatial ON territory_revisions USING gist (geom);
--> statement-breakpoint
CREATE UNIQUE INDEX territory_one_directive_per_draft ON monetary_directives ((payload->>'draftId')) WHERE payload->>'kind' = 'CHANGE_TERRITORY';
--> statement-breakpoint
CREATE FUNCTION helicraft_territory_draft_digest(draft territory_drafts) RETURNS text
LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT encode(sha256(convert_to(jsonb_build_object(
    'id', draft.id, 'stateId', draft.state_id, 'worldId', draft.world_id,
    'baseRevisionId', draft.base_revision_id, 'geometry', draft.geometry,
    'reasonTextId', draft.reason_text_id, 'change', draft.change,
    'version', draft.version, 'createdBy', draft.created_by
  )::text, 'UTF8')), 'hex');
$$;
--> statement-breakpoint
CREATE FUNCTION helicraft_guard_territory_draft() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Territorial drafts and their submitted evidence are retained';
  END IF;
  IF OLD.sealed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Submitted territorial geometry is immutable';
  END IF;
  IF (NEW.id, NEW.state_id, NEW.world_id, NEW.base_revision_id, NEW.created_by, NEW.created_at)
    IS DISTINCT FROM (OLD.id, OLD.state_id, OLD.world_id, OLD.base_revision_id, OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'Territorial draft identity and base are immutable';
  END IF;
  IF NEW.sealed_at IS NOT NULL THEN
    -- Serialize sealing with insertion of a previously missing reason translation.
    PERFORM id FROM localized_texts WHERE id = NEW.reason_text_id FOR UPDATE;
    IF NEW.hash IS DISTINCT FROM helicraft_territory_draft_digest(NEW)
      OR NEW.version <> OLD.version
      OR (NEW.geometry, NEW.reason_text_id, NEW.change) IS DISTINCT FROM (OLD.geometry, OLD.reason_text_id, OLD.change) THEN
      RAISE EXCEPTION 'Submission must seal exactly the saved draft';
    END IF;
  ELSIF NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'Draft edits require optimistic version advancement';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER territory_draft_guard BEFORE UPDATE OR DELETE ON territory_drafts FOR EACH ROW EXECUTE FUNCTION helicraft_guard_territory_draft();
--> statement-breakpoint
CREATE INDEX territory_draft_reason ON territory_drafts (reason_text_id);
--> statement-breakpoint
CREATE FUNCTION helicraft_guard_territorial_translation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM territory_drafts WHERE reason_text_id = NEW.text_id) THEN
    PERFORM id FROM localized_texts WHERE id = NEW.text_id FOR UPDATE;
    IF EXISTS (SELECT 1 FROM territory_drafts WHERE reason_text_id = NEW.text_id AND sealed_at IS NOT NULL) THEN
      RAISE EXCEPTION 'Submitted territorial reasoning and its translations are immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER territorial_translation_guard BEFORE INSERT ON localized_text_values FOR EACH ROW EXECUTE FUNCTION helicraft_guard_territorial_translation();
--> statement-breakpoint
CREATE TRIGGER territory_revision_immutable BEFORE UPDATE OR DELETE ON territory_revisions FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER territory_review_immutable BEFORE UPDATE OR DELETE ON territory_reviews FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER territorial_event_immutable BEFORE UPDATE OR DELETE ON territorial_events FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE FUNCTION helicraft_guard_spatial_world() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'World identity is retained'; END IF;
  IF (NEW.id, NEW.logical_key, NEW.backend_id, NEW.paper_world_id, NEW.dimension, NEW.created_at)
    IS DISTINCT FROM (OLD.id, OLD.logical_key, OLD.backend_id, OLD.paper_world_id, OLD.dimension, OLD.created_at)
    OR (OLD.status = 'RETIRED' AND NEW.status <> 'RETIRED') THEN
    RAISE EXCEPTION 'World identity is immutable; register recreated worlds separately';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER spatial_world_identity BEFORE UPDATE OR DELETE ON spatial_worlds FOR EACH ROW EXECUTE FUNCTION helicraft_guard_spatial_world();
--> statement-breakpoint
CREATE FUNCTION helicraft_guard_territory_application() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE draft territory_drafts; directive monetary_directives;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Territorial applications are retained'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'REVIEW' OR NEW.status = 'REVIEW'
      OR (NEW.id, NEW.draft_id, NEW.directive_id, NEW.created_at) IS DISTINCT FROM
         (OLD.id, OLD.draft_id, OLD.directive_id, OLD.created_at) THEN
      RAISE EXCEPTION 'Only one final territorial application decision is allowed';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM territory_reviews WHERE application_id = NEW.id AND
      decision = CASE NEW.status WHEN 'APPROVED' THEN 'APPROVE' ELSE 'REJECT' END) THEN
      RAISE EXCEPTION 'A recorded administrative reason is required';
    END IF;
  END IF;
  SELECT * INTO STRICT draft FROM territory_drafts WHERE id = NEW.draft_id;
  SELECT * INTO STRICT directive FROM monetary_directives WHERE id = NEW.directive_id;
  IF draft.sealed_at IS NULL OR draft.hash IS DISTINCT FROM helicraft_territory_draft_digest(draft)
    OR directive.state_id <> draft.state_id OR directive.payload->>'kind' <> 'CHANGE_TERRITORY'
    OR directive.payload->>'draftId' IS DISTINCT FROM draft.id::text
    OR directive.payload->>'draftHash' IS DISTINCT FROM draft.hash THEN
    RAISE EXCEPTION 'Territorial application must bind exact immutable state decision';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER territory_application_guard BEFORE INSERT OR UPDATE OR DELETE ON territory_applications FOR EACH ROW EXECUTE FUNCTION helicraft_guard_territory_application();
--> statement-breakpoint
CREATE FUNCTION helicraft_guard_territory_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE draft territory_drafts; application territory_applications; directive monetary_directives;
        review territory_reviews; world spatial_worlds; current_id uuid; previous_number integer;
BEGIN
  -- Same per-world lock protects every writer, including direct SQL and concurrent states.
  SELECT * INTO STRICT world FROM spatial_worlds WHERE id = NEW.world_id FOR UPDATE;
  IF world.status <> 'ACTIVE' OR world.dimension <> 'minecraft:overworld' THEN
    RAISE EXCEPTION 'Territories require a registered active Overworld';
  END IF;
  SELECT * INTO STRICT application FROM territory_applications WHERE id = NEW.application_id;
  SELECT * INTO STRICT draft FROM territory_drafts WHERE id = application.draft_id;
  SELECT * INTO STRICT directive FROM monetary_directives WHERE id = application.directive_id;
  SELECT * INTO STRICT review FROM territory_reviews WHERE application_id = application.id;
  SELECT revision_id INTO current_id FROM active_territories WHERE state_id = NEW.state_id AND world_id = NEW.world_id;
  SELECT number INTO previous_number FROM territory_revisions WHERE id = current_id;
  IF application.status <> 'APPROVED' OR review.decision <> 'APPROVE' OR directive.status <> 'APPLIED'
    OR draft.state_id <> NEW.state_id OR draft.world_id <> NEW.world_id
    OR NEW.geometry IS DISTINCT FROM draft.geometry OR NEW.created_by <> directive.created_by
    OR NEW.ratified_by <> review.actor_id OR NEW.previous_revision_id IS DISTINCT FROM current_id
    OR draft.base_revision_id IS DISTINCT FROM current_id OR NEW.number <> coalesce(previous_number,0) + 1
    OR NOT EXISTS (SELECT 1 FROM states WHERE id = NEW.state_id AND status = 'ACTIVE' AND current_revision_id = directive.governance_revision_id) THEN
    RAISE EXCEPTION 'Territory publication must match the ratified, current state decision';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER territory_revision_guard BEFORE INSERT ON territory_revisions FOR EACH ROW EXECUTE FUNCTION helicraft_guard_territory_revision();
--> statement-breakpoint
CREATE FUNCTION helicraft_guard_active_territory() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE revision territory_revisions; current_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Territory withdrawal requires a legal revision'; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.state_id, NEW.world_id) IS DISTINCT FROM (OLD.state_id, OLD.world_id) THEN
    RAISE EXCEPTION 'Active territorial state/world identity is immutable';
  END IF;
  PERFORM id FROM spatial_worlds WHERE id = NEW.world_id FOR UPDATE;
  SELECT * INTO STRICT revision FROM territory_revisions WHERE id = NEW.revision_id;
  SELECT revision_id INTO current_id FROM active_territories WHERE state_id = NEW.state_id AND world_id = NEW.world_id;
  IF revision.world_id <> NEW.world_id OR revision.state_id <> NEW.state_id
    OR revision.previous_revision_id IS DISTINCT FROM current_id THEN
    RAISE EXCEPTION 'Active territory must advance the exact state/world history';
  END IF;
  IF EXISTS (
    SELECT 1 FROM active_territories active JOIN territory_revisions other ON other.id = active.revision_id
    WHERE active.world_id = NEW.world_id AND active.state_id <> NEW.state_id
      AND other.geom && revision.geom AND ST_Relate(other.geom, revision.geom, '2********')
  ) THEN RAISE EXCEPTION 'Territorial interiors overlap'; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER active_territory_guard BEFORE INSERT OR UPDATE OR DELETE ON active_territories FOR EACH ROW EXECUTE FUNCTION helicraft_guard_active_territory();
--> statement-breakpoint
CREATE FUNCTION helicraft_publish_territorial_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE snapshot_version integer; actor uuid;
BEGIN
  UPDATE spatial_worlds SET version = version + 1 WHERE id = NEW.world_id RETURNING version INTO snapshot_version;
  SELECT ratified_by INTO STRICT actor FROM territory_revisions WHERE id = NEW.revision_id;
  INSERT INTO territorial_events (revision_id, world_id, version, actor_id)
    VALUES (NEW.revision_id, NEW.world_id, snapshot_version, actor);
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER territorial_publication AFTER INSERT OR UPDATE ON active_territories FOR EACH ROW EXECUTE FUNCTION helicraft_publish_territorial_event();

--> statement-breakpoint
CREATE FUNCTION helicraft_guard_territorial_event_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE revision territory_revisions;
BEGIN
  -- Publication events can only be emitted by the active-pointer trigger, never independently.
  IF pg_trigger_depth() < 2 THEN RAISE EXCEPTION 'Territorial event requires atomic publication'; END IF;
  SELECT * INTO STRICT revision FROM territory_revisions WHERE id = NEW.revision_id;
  IF NEW.world_id <> revision.world_id OR NEW.actor_id <> revision.ratified_by
    OR NEW.type <> 'TERRITORY_PUBLISHED'
    OR NEW.version IS DISTINCT FROM (SELECT version FROM spatial_worlds WHERE id = revision.world_id) THEN
    RAISE EXCEPTION 'Territorial event must match its published revision';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER territorial_event_insert_guard BEFORE INSERT ON territorial_events FOR EACH ROW EXECUTE FUNCTION helicraft_guard_territorial_event_insert();
--> statement-breakpoint
CREATE FUNCTION helicraft_check_territorial_commit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_application_id uuid; application territory_applications; review territory_reviews;
BEGIN
  IF TG_TABLE_NAME = 'territory_applications' THEN target_application_id := NEW.id;
  ELSE target_application_id := NEW.application_id; END IF;
  SELECT * INTO STRICT application FROM territory_applications WHERE id = target_application_id;
  IF NOT EXISTS (SELECT 1 FROM monetary_directives WHERE id = application.directive_id AND status = 'APPLIED') THEN
    RAISE EXCEPTION 'Territorial application requires completed state execution';
  END IF;
  SELECT * INTO review FROM territory_reviews WHERE territory_reviews.application_id = application.id;
  IF application.status = 'REVIEW' THEN
    IF review.id IS NOT NULL THEN RAISE EXCEPTION 'Territorial review must finalize its application'; END IF;
  ELSIF review.id IS NULL OR review.decision <> (CASE application.status WHEN 'APPROVED' THEN 'APPROVE' ELSE 'REJECT' END) THEN
    RAISE EXCEPTION 'Territorial final status requires its matching immutable review';
  END IF;
  IF application.status = 'APPROVED' AND NOT EXISTS (
    SELECT 1 FROM territory_revisions revision JOIN territorial_events event ON event.revision_id = revision.id
    WHERE revision.application_id = application.id AND event.world_id = revision.world_id
  ) THEN RAISE EXCEPTION 'Territorial approval, revision and publication must commit together'; END IF;
  IF application.status <> 'APPROVED' AND EXISTS (
    SELECT 1 FROM territory_revisions WHERE territory_revisions.application_id = application.id
  ) THEN RAISE EXCEPTION 'Unapproved territorial application cannot have a revision'; END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER territorial_application_commit AFTER INSERT OR UPDATE ON territory_applications DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION helicraft_check_territorial_commit();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER territorial_review_commit AFTER INSERT ON territory_reviews DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION helicraft_check_territorial_commit();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER territorial_revision_commit AFTER INSERT ON territory_revisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION helicraft_check_territorial_commit();
