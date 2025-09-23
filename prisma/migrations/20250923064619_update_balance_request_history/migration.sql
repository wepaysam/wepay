-- AlterTable
ALTER TABLE "public"."BalanceRequest" ADD COLUMN     "closingBalance" DECIMAL(65,30),
ADD COLUMN     "previousBalance" DECIMAL(65,30);
