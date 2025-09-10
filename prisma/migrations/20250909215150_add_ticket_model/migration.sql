-- CreateTable
CREATE TABLE "tickets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "identificationNumber" INTEGER NOT NULL,
    "location" TEXT,
    "table" INTEGER,
    "price" DECIMAL NOT NULL,
    "order" TEXT,
    "buyer" TEXT,
    "buyerDocument" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tickets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "promotional_image" TEXT,
    "opening_datetime" DATETIME NOT NULL,
    "closing_datetime" DATETIME NOT NULL,
    "map_image" TEXT,
    "description" TEXT,
    "venue" TEXT,
    "created_by" TEXT NOT NULL,
    "nextTicketNumber" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active'
);
INSERT INTO "new_events" ("closing_datetime", "created_at", "created_by", "description", "id", "map_image", "name", "opening_datetime", "promotional_image", "status", "updated_at", "venue") SELECT "closing_datetime", "created_at", "created_by", "description", "id", "map_image", "name", "opening_datetime", "promotional_image", "status", "updated_at", "venue" FROM "events";
DROP TABLE "events";
ALTER TABLE "new_events" RENAME TO "events";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "tickets_eventId_identificationNumber_key" ON "tickets"("eventId", "identificationNumber");
