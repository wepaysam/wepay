-- AlterTable
ALTER TABLE "Transactions" ADD COLUMN     "upiBeneficiaryId" TEXT;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_upiBeneficiaryId_fkey" FOREIGN KEY ("upiBeneficiaryId") REFERENCES "UpiBeneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
