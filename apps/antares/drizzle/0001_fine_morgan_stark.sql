CREATE TYPE "public"."content_kind" AS ENUM('PAGE', 'CHRONICLE');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."role_name" AS ENUM('PLAYER', 'EDITOR', 'MODERATOR', 'ADMIN', 'OWNER');--> statement-breakpoint
CREATE TYPE "public"."skin_model" AS ENUM('CLASSIC', 'SLIM');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED', 'BANNED');--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"absolute_expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"user_agent" text,
	CONSTRAINT "auth_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "content_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "content_kind" NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"markdown" text NOT NULL,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"category" text DEFAULT 'Обновления проекта' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "content_redirects" (
	"kind" "content_kind" NOT NULL,
	"slug" text NOT NULL,
	"document_id" uuid NOT NULL,
	CONSTRAINT "content_redirects_kind_slug_pk" PRIMARY KEY("kind","slug")
);
--> statement-breakpoint
CREATE TABLE "content_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"editor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_skins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"avatar_key" text NOT NULL,
	"sha256" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"model" "skin_model" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_skins_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "player_skins_avatar_key_unique" UNIQUE("avatar_key")
);
--> statement-breakpoint
CREATE TABLE "user_credentials" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role" "role_name" NOT NULL,
	CONSTRAINT "user_roles_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
CREATE TABLE "username_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"old_username" text NOT NULL,
	"new_username" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"username_normalized" text NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"current_skin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"password_changed_at" timestamp with time zone,
	CONSTRAINT "users_username_normalized_unique" UNIQUE("username_normalized"),
	CONSTRAINT "users_username_format" CHECK ("users"."username" ~ '^[A-Za-z0-9_]{3,16}$'),
	CONSTRAINT "users_username_normalized" CHECK ("users"."username_normalized" = lower("users"."username"))
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_documents" ADD CONSTRAINT "content_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_documents" ADD CONSTRAINT "content_documents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_redirects" ADD CONSTRAINT "content_redirects_document_id_content_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."content_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_document_id_content_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."content_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_editor_id_users_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_skins" ADD CONSTRAINT "player_skins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "username_history" ADD CONSTRAINT "username_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_current_skin_id_player_skins_id_fk" FOREIGN KEY ("current_skin_id") REFERENCES "public"."player_skins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_time" ON "admin_audit_log" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "audit_target" ON "admin_audit_log" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "sessions_user" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expiry" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "content_kind_slug" ON "content_documents" USING btree ("kind","slug");--> statement-breakpoint
CREATE INDEX "content_publication" ON "content_documents" USING btree ("kind","status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chronicle_featured" ON "content_documents" USING btree ("kind") WHERE "content_documents"."is_featured" = true AND "content_documents"."kind" = 'CHRONICLE' AND "content_documents"."status" = 'PUBLISHED';--> statement-breakpoint
CREATE UNIQUE INDEX "content_revision_number" ON "content_revisions" USING btree ("document_id","revision");--> statement-breakpoint
CREATE INDEX "skins_user" ON "player_skins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "username_history_user" ON "username_history" USING btree ("user_id");