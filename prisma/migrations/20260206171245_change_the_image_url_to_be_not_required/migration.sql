-- AlterTable
ALTER TABLE "public"."events" ALTER COLUMN "event_image_url" DROP NOT NULL,
ALTER COLUMN "event_image_url" DROP DEFAULT;
