CREATE TABLE "ticket_groups" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "groupKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "table" INTEGER,
    "checkout_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ticket_groups_eventId_groupKey_key" ON "ticket_groups"("eventId", "groupKey");

ALTER TABLE "ticket_groups"
ADD CONSTRAINT "ticket_groups_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "events"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ticket_groups" ("eventId", "groupKey", "description", "table", "created_at", "updated_at")
SELECT DISTINCT
  t."eventId",
  CASE
    WHEN t."table" IS NULL THEN COALESCE(t."description", '')
    ELSE COALESCE(t."description", '') || '__' || t."table"::TEXT
  END AS "groupKey",
  COALESCE(t."description", ''),
  t."table",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "tickets" t;
