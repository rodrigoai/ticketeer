ALTER TABLE "public"."events"
ADD COLUMN "sale_mode" TEXT NOT NULL DEFAULT 'checkout',
ADD COLUMN "cart_payment_service_id" TEXT,
ADD COLUMN "reservation_expires_in_minutes" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "public"."ticket_groups"
ADD COLUMN "product_id" INTEGER;

ALTER TABLE "public"."tickets"
ADD COLUMN "reservationKey" TEXT,
ADD COLUMN "reservedAt" TIMESTAMP(3),
ADD COLUMN "reservedUntil" TIMESTAMP(3);
