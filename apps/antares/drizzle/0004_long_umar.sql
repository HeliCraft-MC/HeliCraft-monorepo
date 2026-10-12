ALTER TABLE "content_documents" ADD COLUMN "original_language" text DEFAULT 'ru' NOT NULL;--> statement-breakpoint
ALTER TABLE "content_documents" ADD COLUMN "translations" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "gallery_images" ADD COLUMN "original_language" text DEFAULT 'ru' NOT NULL;--> statement-breakpoint
ALTER TABLE "gallery_images" ADD COLUMN "translations" jsonb DEFAULT '{}'::jsonb NOT NULL;