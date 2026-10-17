CREATE TABLE "state_office_assignment_approvals" (
	"assignment_id" uuid NOT NULL,
	"office_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "state_office_assignment_approvals_assignment_id_office_id_actor_id_pk" PRIMARY KEY("assignment_id","office_id","actor_id")
);
--> statement-breakpoint
CREATE TABLE "state_office_assignment_votes" (
	"assignment_id" uuid NOT NULL,
	"source" text NOT NULL,
	"voting_id" uuid NOT NULL,
	"approval_option_id" uuid NOT NULL,
	CONSTRAINT "state_office_assignment_votes_assignment_id_source_pk" PRIMARY KEY("assignment_id","source"),
	CONSTRAINT "state_office_assignment_votes_voting_id_unique" UNIQUE("voting_id"),
	CONSTRAINT "office_assignment_vote_source" CHECK ("state_office_assignment_votes"."source" in ('OFFICE', 'POLICY', 'REMOVAL_POLICY'))
);
--> statement-breakpoint
CREATE TABLE "state_office_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_id" uuid NOT NULL,
	"governance_revision_id" uuid NOT NULL,
	"office_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"replaced_user_id" uuid,
	"kind" text NOT NULL,
	"was_vacant" boolean NOT NULL,
	"created_by" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_at" timestamp with time zone,
	CONSTRAINT "office_assignment_kind" CHECK ("state_office_assignments"."kind" in ('APPOINT', 'REMOVE')),
	CONSTRAINT "office_assignment_status" CHECK ("state_office_assignments"."status" in ('PENDING', 'APPLIED', 'CANCELLED')),
	CONSTRAINT "office_assignment_replacement" CHECK ("state_office_assignments"."replaced_user_id" is null or ("state_office_assignments"."kind" = 'APPOINT' and "state_office_assignments"."replaced_user_id" <> "state_office_assignments"."user_id"))
);
--> statement-breakpoint
ALTER TABLE "state_office_assignment_approvals" ADD CONSTRAINT "state_office_assignment_approvals_assignment_id_state_office_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."state_office_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_office_assignment_approvals" ADD CONSTRAINT "state_office_assignment_approvals_office_id_state_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."state_offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_office_assignment_approvals" ADD CONSTRAINT "state_office_assignment_approvals_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_office_assignment_votes" ADD CONSTRAINT "state_office_assignment_votes_assignment_id_state_office_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."state_office_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_office_assignment_votes" ADD CONSTRAINT "state_office_assignment_votes_voting_id_votings_id_fk" FOREIGN KEY ("voting_id") REFERENCES "public"."votings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_office_assignments" ADD CONSTRAINT "state_office_assignments_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_office_assignments" ADD CONSTRAINT "state_office_assignments_governance_revision_id_state_governance_revisions_id_fk" FOREIGN KEY ("governance_revision_id") REFERENCES "public"."state_governance_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_office_assignments" ADD CONSTRAINT "state_office_assignments_office_id_state_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."state_offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_office_assignments" ADD CONSTRAINT "state_office_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_office_assignments" ADD CONSTRAINT "state_office_assignments_replaced_user_id_users_id_fk" FOREIGN KEY ("replaced_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_office_assignments" ADD CONSTRAINT "state_office_assignments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "office_assignment_state" ON "state_office_assignments" USING btree ("state_id","created_at");
--> statement-breakpoint
CREATE FUNCTION protect_office_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Office decision history is immutable';
  END IF;
  IF ROW(NEW.id, NEW.state_id, NEW.governance_revision_id, NEW.office_id, NEW.user_id,
         NEW.replaced_user_id, NEW.kind, NEW.was_vacant, NEW.created_by, NEW.created_at)
     IS DISTINCT FROM
     ROW(OLD.id, OLD.state_id, OLD.governance_revision_id, OLD.office_id, OLD.user_id,
         OLD.replaced_user_id, OLD.kind, OLD.was_vacant, OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'Office decision payload is immutable';
  END IF;
  IF OLD.status <> 'PENDING' AND ROW(NEW.status, NEW.applied_at) IS DISTINCT FROM ROW(OLD.status, OLD.applied_at) THEN
    RAISE EXCEPTION 'Completed office decisions are immutable';
  END IF;
  IF (NEW.status = 'APPLIED') <> (NEW.applied_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Applied decision requires its effective timestamp';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER office_assignment_history BEFORE UPDATE OR DELETE ON state_office_assignments
FOR EACH ROW EXECUTE FUNCTION protect_office_assignment();
