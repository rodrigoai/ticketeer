-- Store the ticket QR hash so public scanner lookups can use an indexed query
-- instead of scanning every ticket and recomputing hashes.
ALTER TABLE "public"."tickets" ADD COLUMN "qrCodeHash" TEXT;

CREATE UNIQUE INDEX "tickets_qrCodeHash_key" ON "public"."tickets"("qrCodeHash");
