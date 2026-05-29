CREATE TABLE "user_carddav_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "user_carddav_providers" ("id", "user_id", "type", "label", "url", "username", "password", "created_at", "updated_at")
SELECT gen_random_uuid(), "user_id", 'radicale', 'Radicale', "url", "username", "password", "created_at", "updated_at"
FROM "user_carddav_config";
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "provider_id" uuid;
--> statement-breakpoint
UPDATE "contacts" c
SET "provider_id" = p."id"
FROM "user_carddav_providers" p
WHERE c."user_id" = p."user_id"
  AND c."synced_at" IS NOT NULL;
--> statement-breakpoint
DROP TABLE "user_carddav_config";
