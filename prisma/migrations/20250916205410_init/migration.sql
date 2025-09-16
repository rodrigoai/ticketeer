-- CreateTable
CREATE TABLE "public"."events" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "promotional_image" TEXT,
    "opening_datetime" TIMESTAMP(3) NOT NULL,
    "closing_datetime" TIMESTAMP(3) NOT NULL,
    "map_image" TEXT,
    "description" TEXT,
    "venue" TEXT,
    "created_by" TEXT NOT NULL,
    "nextTicketNumber" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tickets" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "identificationNumber" INTEGER NOT NULL,
    "location" TEXT,
    "table" INTEGER,
    "price" DECIMAL(65,30) NOT NULL,
    "order" TEXT,
    "buyer" TEXT,
    "buyerDocument" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "buyerEmail" TEXT,
    "salesEndDateTime" TIMESTAMP(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_eventId_identificationNumber_key" ON "public"."tickets"("eventId", "identificationNumber");

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
