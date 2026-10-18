CREATE TABLE "institution_policy_texts" (
	"directive_id" uuid NOT NULL,
	"action" text NOT NULL,
	"text_id" uuid NOT NULL,
	CONSTRAINT "institution_policy_texts_directive_id_action_pk" PRIMARY KEY("directive_id","action")
);
--> statement-breakpoint
ALTER TABLE "institution_policy_texts" ADD CONSTRAINT "institution_policy_texts_directive_id_monetary_directives_id_fk" FOREIGN KEY ("directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_policy_texts" ADD CONSTRAINT "institution_policy_texts_text_id_localized_texts_id_fk" FOREIGN KEY ("text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE TRIGGER institution_policy_text_immutable
BEFORE UPDATE OR DELETE ON institution_policy_texts
FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
