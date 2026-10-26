CREATE TABLE "active_territories" (
	"state_id" uuid NOT NULL,
	"world_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	CONSTRAINT "active_territories_state_id_world_id_pk" PRIMARY KEY("state_id","world_id"),
	CONSTRAINT "active_territories_revision_id_unique" UNIQUE("revision_id")
);
--> statement-breakpoint
CREATE TABLE "spatial_worlds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"logical_key" text NOT NULL,
	"backend_id" text NOT NULL,
	"paper_world_id" uuid NOT NULL,
	"dimension" text NOT NULL,
	"name_text_id" uuid NOT NULL,
	"tile_key" text NOT NULL,
	"max_zoom" integer DEFAULT 3 NOT NULL,
	"extra_zoom" integer DEFAULT 2 NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spatial_worlds_logical_key_unique" UNIQUE("logical_key"),
	CONSTRAINT "spatial_world_status" CHECK ("spatial_worlds"."status" in ('ACTIVE','RETIRED')),
	CONSTRAINT "spatial_world_dimension" CHECK ("spatial_worlds"."dimension" in ('minecraft:overworld','minecraft:the_nether','minecraft:the_end')),
	CONSTRAINT "spatial_world_zoom" CHECK ("spatial_worlds"."max_zoom" between 0 and 8 and "spatial_worlds"."extra_zoom" between 0 and 4)
);
--> statement-breakpoint
CREATE TABLE "territorial_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"world_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"type" text DEFAULT 'TERRITORY_PUBLISHED' NOT NULL,
	"actor_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "territorial_events_revision_id_unique" UNIQUE("revision_id")
);
--> statement-breakpoint
CREATE TABLE "territory_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"directive_id" uuid NOT NULL,
	"status" text DEFAULT 'REVIEW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "territory_applications_draft_id_unique" UNIQUE("draft_id"),
	CONSTRAINT "territory_applications_directive_id_unique" UNIQUE("directive_id"),
	CONSTRAINT "territory_application_status" CHECK ("territory_applications"."status" in ('REVIEW','APPROVED','REJECTED'))
);
--> statement-breakpoint
CREATE TABLE "territory_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_id" uuid NOT NULL,
	"world_id" uuid NOT NULL,
	"base_revision_id" uuid,
	"geometry" jsonb,
	"reason_text_id" uuid NOT NULL,
	"change" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid NOT NULL,
	"sealed_at" timestamp with time zone,
	"hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "territory_draft_version" CHECK ("territory_drafts"."version" > 0),
	CONSTRAINT "territory_draft_change" CHECK ("territory_drafts"."change" in ('INITIAL','EXPAND','REDUCE','RESHAPE')),
	CONSTRAINT "territory_draft_seal" CHECK (("territory_drafts"."sealed_at" is null and "territory_drafts"."hash" is null) or ("territory_drafts"."sealed_at" is not null and "territory_drafts"."hash" ~ '^[a-f0-9]{64}$' and "territory_drafts"."geometry" is not null))
);
--> statement-breakpoint
CREATE TABLE "territory_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "territory_reviews_application_id_unique" UNIQUE("application_id"),
	CONSTRAINT "territory_review_decision" CHECK ("territory_reviews"."decision" in ('APPROVE','REJECT') and length(trim("territory_reviews"."reason")) between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "territory_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_id" uuid NOT NULL,
	"world_id" uuid NOT NULL,
	"previous_revision_id" uuid,
	"number" integer NOT NULL,
	"application_id" uuid NOT NULL,
	"geometry" jsonb NOT NULL,
	"geom" geometry(MultiPolygon,0) GENERATED ALWAYS AS (ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(geometry),0))) STORED,
	"area" double precision NOT NULL,
	"created_by" uuid NOT NULL,
	"ratified_by" uuid NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "territory_revisions_application_id_unique" UNIQUE("application_id"),
	CONSTRAINT "territory_revision_number_positive" CHECK ("territory_revisions"."number" > 0),
	CONSTRAINT "territory_revision_valid" CHECK (ST_IsValid("territory_revisions"."geom") and not ST_IsEmpty("territory_revisions"."geom") and ST_NPoints("territory_revisions"."geom") <= 4096 and ST_Area("territory_revisions"."geom") > 0 and ST_Area("territory_revisions"."geom") <= 1000000000 and "territory_revisions"."area" = ST_Area("territory_revisions"."geom"))
);
--> statement-breakpoint
ALTER TABLE "active_territories" ADD CONSTRAINT "active_territories_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_territories" ADD CONSTRAINT "active_territories_world_id_spatial_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."spatial_worlds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_territories" ADD CONSTRAINT "active_territories_revision_id_territory_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."territory_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spatial_worlds" ADD CONSTRAINT "spatial_worlds_name_text_id_localized_texts_id_fk" FOREIGN KEY ("name_text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territorial_events" ADD CONSTRAINT "territorial_events_revision_id_territory_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."territory_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territorial_events" ADD CONSTRAINT "territorial_events_world_id_spatial_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."spatial_worlds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territorial_events" ADD CONSTRAINT "territorial_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territory_applications" ADD CONSTRAINT "territory_applications_draft_id_territory_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."territory_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territory_applications" ADD CONSTRAINT "territory_applications_directive_id_monetary_directives_id_fk" FOREIGN KEY ("directive_id") REFERENCES "public"."monetary_directives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territory_drafts" ADD CONSTRAINT "territory_drafts_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territory_drafts" ADD CONSTRAINT "territory_drafts_world_id_spatial_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."spatial_worlds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territory_drafts" ADD CONSTRAINT "territory_drafts_reason_text_id_localized_texts_id_fk" FOREIGN KEY ("reason_text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territory_drafts" ADD CONSTRAINT "territory_drafts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territory_reviews" ADD CONSTRAINT "territory_reviews_application_id_territory_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."territory_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territory_reviews" ADD CONSTRAINT "territory_reviews_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territory_revisions" ADD CONSTRAINT "territory_revisions_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territory_revisions" ADD CONSTRAINT "territory_revisions_world_id_spatial_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."spatial_worlds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territory_revisions" ADD CONSTRAINT "territory_revisions_application_id_territory_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."territory_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territory_revisions" ADD CONSTRAINT "territory_revisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territory_revisions" ADD CONSTRAINT "territory_revisions_ratified_by_users_id_fk" FOREIGN KEY ("ratified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "spatial_world_paper_identity" ON "spatial_worlds" USING btree ("backend_id","paper_world_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spatial_world_active_tiles" ON "spatial_worlds" USING btree ("backend_id","tile_key") WHERE "spatial_worlds"."status" = 'ACTIVE';--> statement-breakpoint
CREATE UNIQUE INDEX "territorial_event_version" ON "territorial_events" USING btree ("world_id","version");--> statement-breakpoint
CREATE INDEX "territory_draft_state" ON "territory_drafts" USING btree ("state_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "territory_revision_number" ON "territory_revisions" USING btree ("state_id","world_id","number");--> statement-breakpoint
CREATE INDEX "territory_revision_world" ON "territory_revisions" USING btree ("world_id");