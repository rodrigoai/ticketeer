ALTER TABLE "events" ADD COLUMN "public_hash" TEXT;

UPDATE "events"
SET "public_hash" = SUBSTRING(MD5("id"::text || clock_timestamp()::text || random()::text) FROM 1 FOR 12)
WHERE "public_hash" IS NULL;

ALTER TABLE "events" ALTER COLUMN "public_hash" SET NOT NULL;

CREATE UNIQUE INDEX "events_public_hash_key" ON "events"("public_hash");
