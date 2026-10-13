CREATE TABLE "localized_text_values" (
	"text_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "localized_text_values_text_id_locale_pk" PRIMARY KEY("text_id","locale"),
	CONSTRAINT "localized_supported_locale" CHECK ("localized_text_values"."locale" in ('ru', 'en'))
);
--> statement-breakpoint
CREATE TABLE "localized_texts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "state_constitution_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"constitution_revision_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"block_key" uuid NOT NULL,
	"content_text_id" uuid,
	"descriptor" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "state_constitution_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_id" uuid NOT NULL,
	"governance_revision_id" uuid NOT NULL,
	"title_text_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "state_constitution_revisions_governance_revision_id_unique" UNIQUE("governance_revision_id")
);
--> statement-breakpoint
CREATE TABLE "state_creation_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"state_id" uuid,
	"base_revision_id" uuid,
	"title" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"step" integer DEFAULT 0 NOT NULL,
	"configuration" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_state_id" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "state_founders" (
	"state_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"founder_type" text NOT NULL,
	CONSTRAINT "state_founders_state_id_user_id_pk" PRIMARY KEY("state_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "state_governance_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"previous_revision_id" uuid,
	"actor_id" uuid NOT NULL,
	"admin_override" boolean DEFAULT false NOT NULL,
	"reason" text,
	"configuration" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "state_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "state_media_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "state_memberships" (
	"state_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"citizenship_type" text DEFAULT 'FULL_CITIZEN' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "state_memberships_state_id_user_id_pk" PRIMARY KEY("state_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "state_office_holders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"since" timestamp with time zone DEFAULT now() NOT NULL,
	"until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "state_office_revision_data" (
	"office_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "state_office_revision_data_office_id_revision_id_pk" PRIMARY KEY("office_id","revision_id")
);
--> statement-breakpoint
CREATE TABLE "state_offices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"state_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "state_revision_texts" (
	"revision_id" uuid NOT NULL,
	"path" text NOT NULL,
	"text_id" uuid NOT NULL,
	CONSTRAINT "state_revision_texts_revision_id_path_pk" PRIMARY KEY("revision_id","path")
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'CREATED' NOT NULL,
	"status_reason" text,
	"current_revision_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "states_slug_unique" UNIQUE("slug"),
	CONSTRAINT "state_status_valid" CHECK ("states"."status" in ('CREATED','ACTIVE','SUSPENDED','REJECTED','DORMANT','DISSOLVED'))
);
--> statement-breakpoint
CREATE TABLE "voting_ballot_choices" (
	"ballot_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	CONSTRAINT "voting_ballot_choices_ballot_id_option_id_pk" PRIMARY KEY("ballot_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "voting_ballots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voting_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"abstain" boolean DEFAULT false NOT NULL,
	"cast_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voting_eligible_voters" (
	"voting_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "voting_eligible_voters_voting_id_user_id_pk" PRIMARY KEY("voting_id","user_id"),
	CONSTRAINT "voting_weight_positive" CHECK ("voting_eligible_voters"."weight" > 0)
);
--> statement-breakpoint
CREATE TABLE "voting_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voting_id" uuid NOT NULL,
	"option_key" uuid NOT NULL,
	"label_text_id" uuid NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"title_text_id" uuid NOT NULL,
	"description_text_id" uuid NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"configuration" jsonb NOT NULL,
	"governance_revision_id" uuid,
	"snapshot_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voting_window_valid" CHECK ("votings"."closes_at" > "votings"."opens_at")
);
--> statement-breakpoint
ALTER TABLE "localized_text_values" ADD CONSTRAINT "localized_text_values_text_id_localized_texts_id_fk" FOREIGN KEY ("text_id") REFERENCES "public"."localized_texts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_constitution_blocks" ADD CONSTRAINT "state_constitution_blocks_constitution_revision_id_state_constitution_revisions_id_fk" FOREIGN KEY ("constitution_revision_id") REFERENCES "public"."state_constitution_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_constitution_blocks" ADD CONSTRAINT "state_constitution_blocks_content_text_id_localized_texts_id_fk" FOREIGN KEY ("content_text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_constitution_revisions" ADD CONSTRAINT "state_constitution_revisions_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_constitution_revisions" ADD CONSTRAINT "state_constitution_revisions_governance_revision_id_state_governance_revisions_id_fk" FOREIGN KEY ("governance_revision_id") REFERENCES "public"."state_governance_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_constitution_revisions" ADD CONSTRAINT "state_constitution_revisions_title_text_id_localized_texts_id_fk" FOREIGN KEY ("title_text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_creation_drafts" ADD CONSTRAINT "state_creation_drafts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_creation_drafts" ADD CONSTRAINT "state_creation_drafts_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_creation_drafts" ADD CONSTRAINT "state_creation_drafts_submitted_state_id_states_id_fk" FOREIGN KEY ("submitted_state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_founders" ADD CONSTRAINT "state_founders_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_founders" ADD CONSTRAINT "state_founders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_governance_revisions" ADD CONSTRAINT "state_governance_revisions_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_governance_revisions" ADD CONSTRAINT "state_governance_revisions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_media" ADD CONSTRAINT "state_media_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_memberships" ADD CONSTRAINT "state_memberships_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_memberships" ADD CONSTRAINT "state_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_office_holders" ADD CONSTRAINT "state_office_holders_office_id_state_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."state_offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_office_holders" ADD CONSTRAINT "state_office_holders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_office_revision_data" ADD CONSTRAINT "state_office_revision_data_office_id_state_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."state_offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_office_revision_data" ADD CONSTRAINT "state_office_revision_data_revision_id_state_governance_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."state_governance_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_offices" ADD CONSTRAINT "state_offices_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_revision_texts" ADD CONSTRAINT "state_revision_texts_revision_id_state_governance_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."state_governance_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_revision_texts" ADD CONSTRAINT "state_revision_texts_text_id_localized_texts_id_fk" FOREIGN KEY ("text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_ballot_choices" ADD CONSTRAINT "voting_ballot_choices_ballot_id_voting_ballots_id_fk" FOREIGN KEY ("ballot_id") REFERENCES "public"."voting_ballots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_ballot_choices" ADD CONSTRAINT "voting_ballot_choices_option_id_voting_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."voting_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_ballots" ADD CONSTRAINT "voting_ballots_voting_id_votings_id_fk" FOREIGN KEY ("voting_id") REFERENCES "public"."votings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_ballots" ADD CONSTRAINT "voting_ballots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_eligible_voters" ADD CONSTRAINT "voting_eligible_voters_voting_id_votings_id_fk" FOREIGN KEY ("voting_id") REFERENCES "public"."votings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_eligible_voters" ADD CONSTRAINT "voting_eligible_voters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_options" ADD CONSTRAINT "voting_options_voting_id_votings_id_fk" FOREIGN KEY ("voting_id") REFERENCES "public"."votings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_options" ADD CONSTRAINT "voting_options_label_text_id_localized_texts_id_fk" FOREIGN KEY ("label_text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votings" ADD CONSTRAINT "votings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votings" ADD CONSTRAINT "votings_title_text_id_localized_texts_id_fk" FOREIGN KEY ("title_text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votings" ADD CONSTRAINT "votings_description_text_id_localized_texts_id_fk" FOREIGN KEY ("description_text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votings" ADD CONSTRAINT "votings_governance_revision_id_state_governance_revisions_id_fk" FOREIGN KEY ("governance_revision_id") REFERENCES "public"."state_governance_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "constitution_block_position" ON "state_constitution_blocks" USING btree ("constitution_revision_id","position");--> statement-breakpoint
CREATE INDEX "state_draft_owner" ON "state_creation_drafts" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "state_primary_founder" ON "state_founders" USING btree ("state_id") WHERE "state_founders"."founder_type" = 'PRIMARY';--> statement-breakpoint
CREATE UNIQUE INDEX "state_revision_number" ON "state_governance_revisions" USING btree ("state_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "office_active_holder" ON "state_office_holders" USING btree ("office_id","user_id") WHERE "state_office_holders"."until" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "voting_one_ballot" ON "voting_ballots" USING btree ("voting_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "voting_option_key" ON "voting_options" USING btree ("voting_id","option_key");--> statement-breakpoint
CREATE INDEX "voting_schedule" ON "votings" USING btree ("status","opens_at");