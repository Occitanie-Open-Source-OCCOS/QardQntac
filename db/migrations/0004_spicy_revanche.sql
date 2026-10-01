ALTER TABLE "contacts"
RENAME COLUMN "phone" TO "phones";
--> statement-breakpoint
ALTER TABLE "contacts"
ALTER COLUMN "phones" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "contacts"
ALTER COLUMN "phones" TYPE jsonb
USING (
  CASE
    WHEN NULLIF(BTRIM("phones"), '') IS NULL
      THEN '[]'::jsonb
    ELSE jsonb_build_array(
      jsonb_build_object(
        'number', "phones",
        'label', ''
      )
    )
  END
);
--> statement-breakpoint
ALTER TABLE "contacts"
ALTER COLUMN "phones" SET DEFAULT '[]'::jsonb;
