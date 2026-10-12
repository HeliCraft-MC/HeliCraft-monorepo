CREATE TABLE "gallery_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"alt" text NOT NULL,
	"place" text DEFAULT '' NOT NULL,
	"location" jsonb,
	"player_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"storage_key" text NOT NULL,
	"thumbnail_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "gallery_images_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "gallery_images_thumbnail_key_unique" UNIQUE("thumbnail_key")
);
--> statement-breakpoint
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gallery_publication" ON "gallery_images" USING btree ("deleted_at","created_at");--> statement-breakpoint
CREATE INDEX "gallery_owner" ON "gallery_images" USING btree ("owner_id");