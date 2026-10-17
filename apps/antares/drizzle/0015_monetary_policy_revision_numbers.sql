-- Assign an immutable per-currency revision number once, without changing policy payloads or timestamps.
ALTER TABLE "monetary_policy_revisions" ADD COLUMN "number" integer;
--> statement-breakpoint
-- The table remains exclusively locked by this transactional migration until its history guard is re-enabled.
ALTER TABLE "monetary_policy_revisions" DISABLE TRIGGER monetary_policy_history;
--> statement-breakpoint
WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY currency_id ORDER BY created_at, id)::integer AS revision_number
  FROM monetary_policy_revisions
)
UPDATE monetary_policy_revisions AS policy SET number = numbered.revision_number
FROM numbered WHERE policy.id = numbered.id;
--> statement-breakpoint
ALTER TABLE "monetary_policy_revisions" ENABLE TRIGGER monetary_policy_history;
--> statement-breakpoint
ALTER TABLE "monetary_policy_revisions" ALTER COLUMN "number" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "monetary_policy_number" ON "monetary_policy_revisions" USING btree ("currency_id","number");
--> statement-breakpoint
ALTER TABLE "monetary_policy_revisions" ADD CONSTRAINT "monetary_policy_number_positive" CHECK ("number" > 0);
