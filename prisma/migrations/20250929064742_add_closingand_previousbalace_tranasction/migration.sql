-- AlterTable
ALTER TABLE "public"."Transactions" ADD COLUMN     "closingBalance" DECIMAL(65,30),
ADD COLUMN     "previousBalance" DECIMAL(65,30);
