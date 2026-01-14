-- AlterTable
ALTER TABLE "public"."tickets" ADD COLUMN     "accessoryCollected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "accessoryCollectedAt" TIMESTAMP(3),
ADD COLUMN     "accessoryCollectedNotes" TEXT;
