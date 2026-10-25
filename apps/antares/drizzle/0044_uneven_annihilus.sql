CREATE TABLE "minecraft_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"username" text NOT NULL,
	"proxy_id" text NOT NULL,
	"connection_id" uuid NOT NULL,
	"verifier_hash" text NOT NULL,
	"code_hash" text NOT NULL,
	"status" text DEFAULT 'WAITING_AUTH' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"approved_session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"polled_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "minecraft_challenges_connection_id_unique" UNIQUE("connection_id"),
	CONSTRAINT "minecraft_challenge_status" CHECK ("minecraft_challenges"."status" in ('WAITING_AUTH','APPROVED','CONSUMED','REJECTED','EXPIRED','DISCONNECTED')),
	CONSTRAINT "minecraft_challenge_attempts" CHECK ("minecraft_challenges"."attempts" between 0 and 5),
	CONSTRAINT "minecraft_challenge_lifetime" CHECK ("minecraft_challenges"."expires_at" > "minecraft_challenges"."created_at")
);
--> statement-breakpoint
CREATE TABLE "minecraft_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"type" text NOT NULL,
	"source" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"visibility" text DEFAULT 'PRIVATE' NOT NULL,
	"reason" text,
	CONSTRAINT "minecraft_event_type" CHECK ("minecraft_events"."type" in ('MINECRAFT_SESSION_STARTED','MINECRAFT_SESSION_ENDED')),
	CONSTRAINT "minecraft_event_private" CHECK ("minecraft_events"."visibility" = 'PRIVATE' and "minecraft_events"."schema_version" = 1)
);
--> statement-breakpoint
CREATE TABLE "minecraft_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"username" text NOT NULL,
	"proxy_id" text NOT NULL,
	"backend_id" text NOT NULL,
	"connection_id" uuid NOT NULL,
	"approved_session_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"joined_at" timestamp with time zone,
	"proxy_expires_at" timestamp with time zone NOT NULL,
	"paper_expires_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"end_reason" text,
	CONSTRAINT "minecraft_sessions_challenge_id_unique" UNIQUE("challenge_id"),
	CONSTRAINT "minecraft_sessions_connection_id_unique" UNIQUE("connection_id")
);
--> statement-breakpoint
ALTER TABLE "minecraft_challenges" ADD CONSTRAINT "minecraft_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_challenges" ADD CONSTRAINT "minecraft_challenges_approved_session_id_auth_sessions_id_fk" FOREIGN KEY ("approved_session_id") REFERENCES "public"."auth_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_events" ADD CONSTRAINT "minecraft_events_session_id_minecraft_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."minecraft_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_events" ADD CONSTRAINT "minecraft_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_sessions" ADD CONSTRAINT "minecraft_sessions_challenge_id_minecraft_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."minecraft_challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_sessions" ADD CONSTRAINT "minecraft_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_sessions" ADD CONSTRAINT "minecraft_sessions_approved_session_id_auth_sessions_id_fk" FOREIGN KEY ("approved_session_id") REFERENCES "public"."auth_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "minecraft_challenges_account" ON "minecraft_challenges" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "minecraft_event_once" ON "minecraft_events" USING btree ("session_id","type");--> statement-breakpoint
CREATE INDEX "minecraft_events_account" ON "minecraft_events" USING btree ("actor_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "minecraft_one_session" ON "minecraft_sessions" USING btree ("user_id") WHERE "minecraft_sessions"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "minecraft_sessions_account" ON "minecraft_sessions" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE TRIGGER minecraft_events_append_only BEFORE UPDATE OR DELETE ON minecraft_events
FOR EACH ROW EXECUTE FUNCTION helicraft_reject_evidence_mutation();
