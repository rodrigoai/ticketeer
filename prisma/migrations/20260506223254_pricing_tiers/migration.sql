/*
  Warnings:

  - You are about to alter the column `price` on the `ticket_group_pricing_tiers` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "public"."ticket_group_pricing_tiers" ALTER COLUMN "price" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "updated_at" DROP DEFAULT;
