CREATE TABLE "spatial_world_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"service_id" text NOT NULL,
	"action" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spatial_world_event_action" CHECK ("spatial_world_events"."action" in ('REGISTERED','RETIRED'))
);
--> statement-breakpoint
ALTER TABLE "spatial_world_events" ADD CONSTRAINT "spatial_world_events_world_id_spatial_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."spatial_worlds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "spatial_world_event_once" ON "spatial_world_events" USING btree ("world_id","action");
--> statement-breakpoint
CREATE TRIGGER spatial_world_event_immutable BEFORE UPDATE OR DELETE ON spatial_world_events FOR EACH ROW EXECUTE FUNCTION helicraft_reject_revision_mutation();
