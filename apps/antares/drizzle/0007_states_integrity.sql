-- Published revisions are historical records. Corrections insert a new revision.
CREATE FUNCTION helicraft_reject_revision_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Published historical records are immutable' USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER governance_revision_immutable BEFORE UPDATE OR DELETE ON state_governance_revisions FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER constitution_revision_immutable BEFORE UPDATE OR DELETE ON state_constitution_revisions FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER constitution_block_immutable BEFORE UPDATE OR DELETE ON state_constitution_blocks FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER office_revision_immutable BEFORE UPDATE OR DELETE ON state_office_revision_data FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER revision_text_immutable BEFORE UPDATE OR DELETE ON state_revision_texts FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
CREATE TRIGGER localized_value_immutable BEFORE UPDATE OR DELETE ON localized_text_values FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
--> statement-breakpoint
ALTER TABLE states ADD CONSTRAINT state_current_revision_fk FOREIGN KEY (current_revision_id) REFERENCES state_governance_revisions(id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE state_governance_revisions ADD CONSTRAINT governance_previous_revision_fk FOREIGN KEY (previous_revision_id) REFERENCES state_governance_revisions(id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE state_creation_drafts ADD CONSTRAINT state_draft_base_revision_fk FOREIGN KEY (base_revision_id) REFERENCES state_governance_revisions(id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE state_reform_votes ADD CONSTRAINT state_reform_voting_fk FOREIGN KEY (voting_id) REFERENCES votings(id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE state_founders ADD CONSTRAINT state_founder_type_valid CHECK (founder_type IN ('PRIMARY', 'COFOUNDER'));
--> statement-breakpoint
ALTER TABLE state_creation_drafts ADD CONSTRAINT state_draft_version_positive CHECK (version > 0);
--> statement-breakpoint
ALTER TABLE votings ADD CONSTRAINT voting_status_valid CHECK (status IN ('DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED'));
