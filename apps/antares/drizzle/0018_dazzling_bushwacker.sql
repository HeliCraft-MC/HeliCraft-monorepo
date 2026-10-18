CREATE TABLE "site_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"server_name" text NOT NULL,
	"minecraft_address" text NOT NULL,
	"github_url" text NOT NULL,
	"logo_key" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_singleton" CHECK ("site_settings"."id" = '00000000-0000-4000-8000-000000000001'::uuid)
);
