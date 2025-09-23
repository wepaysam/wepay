/*
  Warnings:

  - A unique constraint covering the columns `[userId,accountNumber]` on the table `Beneficiary` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,accountNumber]` on the table `DmtBeneficiary` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,upiId]` on the table `UpiBeneficiary` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Beneficiary_accountNumber_key";

-- DropIndex
DROP INDEX "public"."DmtBeneficiary_accountNumber_key";

-- DropIndex
DROP INDEX "public"."UpiBeneficiary_upiId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Beneficiary_userId_accountNumber_key" ON "public"."Beneficiary"("userId", "accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DmtBeneficiary_userId_accountNumber_key" ON "public"."DmtBeneficiary"("userId", "accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "UpiBeneficiary_userId_upiId_key" ON "public"."UpiBeneficiary"("userId", "upiId");
