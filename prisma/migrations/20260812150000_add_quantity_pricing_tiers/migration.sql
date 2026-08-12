ALTER TABLE "ticket_group_pricing_tiers"
ADD COLUMN "type" TEXT NOT NULL DEFAULT 'period',
ADD COLUMN "quantity" INTEGER,
ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "start_at" DROP NOT NULL,
ALTER COLUMN "end_at" DROP NOT NULL;

WITH ordered_tiers AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "ticketGroupId"
    ORDER BY "created_at" ASC, "id" ASC
  )::INTEGER - 1 AS tier_position
  FROM "ticket_group_pricing_tiers"
)
UPDATE "ticket_group_pricing_tiers" AS tier
SET "position" = ordered_tiers.tier_position
FROM ordered_tiers
WHERE tier."id" = ordered_tiers."id";

DROP INDEX IF EXISTS "ticket_group_pricing_tiers_ticketGroupId_start_at_end_at_idx";
CREATE INDEX "ticket_group_pricing_tiers_ticketGroupId_position_idx"
ON "ticket_group_pricing_tiers"("ticketGroupId", "position");
