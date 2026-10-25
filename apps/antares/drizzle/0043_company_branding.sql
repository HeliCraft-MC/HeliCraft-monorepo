CREATE TABLE "company_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"storage_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_media_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "company_media_kind" CHECK ("company_media"."kind" in ('LOGO','COVER')),
	CONSTRAINT "company_media_dimensions" CHECK ("company_media"."width" > 0 and "company_media"."height" > 0 and ("company_media"."kind" <> 'LOGO' or "company_media"."width" = "company_media"."height"))
);
--> statement-breakpoint
ALTER TABLE "company_media" ADD CONSTRAINT "company_media_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_media" ADD CONSTRAINT "company_media_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_media_company" ON "company_media" USING btree ("company_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION verify_company_charter_source() RETURNS trigger LANGUAGE plpgsql AS $$
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
    WHEN 'UPDATE_PROFILE' THEN
      expected := original.content || jsonb_build_object('name', source.payload->'name', 'description', source.payload->'description', 'categories', source.payload->'categories');
      IF source.payload ? 'branding' THEN
        expected := expected || jsonb_build_object('branding', source.payload->'branding');
      END IF;
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
