-- CreateTable
CREATE TABLE "events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "promotional_image" TEXT,
    "opening_datetime" DATETIME NOT NULL,
    "closing_datetime" DATETIME NOT NULL,
    "map_image" TEXT,
    "description" TEXT,
    "venue" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active'
);
