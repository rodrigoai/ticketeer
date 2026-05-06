CREATE TEMP TABLE merged_ticket_groups AS
SELECT
  "eventId",
  COALESCE("description", '') AS "groupKey",
  COALESCE("description", '') AS "description",
  NULL::INTEGER AS "table",
  MAX("checkout_url") FILTER (WHERE "checkout_url" IS NOT NULL AND "checkout_url" <> '') AS "checkout_url",
  MIN("created_at") AS "created_at",
  MAX("updated_at") AS "updated_at"
FROM "ticket_groups"
GROUP BY "eventId", COALESCE("description", '');

DELETE FROM "ticket_groups";

INSERT INTO "ticket_groups" (
  "eventId",
  "groupKey",
  "description",
  "table",
  "checkout_url",
  "created_at",
  "updated_at"
)
SELECT
  "eventId",
  "groupKey",
  "description",
  "table",
  "checkout_url",
  "created_at",
  "updated_at"
FROM merged_ticket_groups;
