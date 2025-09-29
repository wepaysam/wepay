-- CreateEnum
CREATE TYPE "public"."UserChargeType" AS ENUM ('DEDUCTED', 'REVERTED');

-- AlterTable
ALTER TABLE "public"."UserCharge" ADD COLUMN     "type" "public"."UserChargeType" NOT NULL DEFAULT 'DEDUCTED';
