CREATE TABLE "cart_purchases" (
    "id" TEXT NOT NULL,
    "eventId" INTEGER NOT NULL,
    "reservationKey" TEXT NOT NULL,
    "ticketIds" JSONB NOT NULL,
    "customer" JSONB NOT NULL,
    "cartPageId" TEXT NOT NULL,
    "orderId" TEXT,
    "emailSent" BOOLEAN,
    "qrEmailSent" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cart_purchases_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cart_purchases_eventId_orderId_idx" ON "cart_purchases"("eventId", "orderId");
ALTER TABLE "cart_purchases" ADD CONSTRAINT "cart_purchases_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
