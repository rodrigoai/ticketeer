-- AlterTable
ALTER TABLE "public"."events" ADD COLUMN     "checkout_page_id" TEXT,
ADD COLUMN     "checkout_page_title" TEXT,
ADD COLUMN     "event_image_url" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "public"."user_profiles" (
    "id" TEXT NOT NULL,
    "nova_money_api_key" TEXT NOT NULL,
    "nova_money_tenant" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);
