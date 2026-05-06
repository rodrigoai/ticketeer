CREATE TABLE "ticket_group_pricing_tiers" (
    "id" SERIAL NOT NULL,
    "ticketGroupId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_group_pricing_tiers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ticket_group_pricing_tiers_ticketGroupId_start_at_end_at_idx"
ON "ticket_group_pricing_tiers"("ticketGroupId", "start_at", "end_at");

ALTER TABLE "ticket_group_pricing_tiers"
ADD CONSTRAINT "ticket_group_pricing_tiers_ticketGroupId_fkey"
FOREIGN KEY ("ticketGroupId") REFERENCES "ticket_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
