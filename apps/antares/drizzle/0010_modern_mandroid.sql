CREATE TABLE "gallery_state_links" (
	"image_id" uuid NOT NULL,
	"state_id" uuid NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "gallery_state_links_image_id_state_id_role_pk" PRIMARY KEY("image_id","state_id","role"),
	CONSTRAINT "gallery_state_role" CHECK ("gallery_state_links"."role" in ('LOCATION', 'PARTICIPANT', 'RELATED'))
);
--> statement-breakpoint
CREATE TABLE "voting_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voting_id" uuid NOT NULL,
	"question_key" uuid NOT NULL,
	"title_text_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gallery_state_links" ADD CONSTRAINT "gallery_state_links_image_id_gallery_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."gallery_images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_state_links" ADD CONSTRAINT "gallery_state_links_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_questions" ADD CONSTRAINT "voting_questions_voting_id_votings_id_fk" FOREIGN KEY ("voting_id") REFERENCES "public"."votings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_questions" ADD CONSTRAINT "voting_questions_title_text_id_localized_texts_id_fk" FOREIGN KEY ("title_text_id") REFERENCES "public"."localized_texts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "voting_question_key" ON "voting_questions" USING btree ("voting_id","question_key");