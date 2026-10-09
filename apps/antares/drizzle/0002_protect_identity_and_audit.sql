-- Durable player identifiers and audit evidence are immutable even through direct SQL.
CREATE FUNCTION helicraft_protect_user_identity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Player UUID is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER users_immutable_uuid BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION helicraft_protect_user_identity();
--> statement-breakpoint
CREATE FUNCTION helicraft_reject_evidence_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Historical evidence is append-only' USING ERRCODE = '23514';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER admin_audit_log_append_only BEFORE UPDATE OR DELETE ON admin_audit_log
FOR EACH ROW EXECUTE FUNCTION helicraft_reject_evidence_mutation();
--> statement-breakpoint
CREATE TRIGGER content_revisions_append_only BEFORE UPDATE OR DELETE ON content_revisions
FOR EACH ROW EXECUTE FUNCTION helicraft_reject_evidence_mutation();
--> statement-breakpoint
CREATE TRIGGER username_history_append_only BEFORE UPDATE OR DELETE ON username_history
FOR EACH ROW EXECUTE FUNCTION helicraft_reject_evidence_mutation();
