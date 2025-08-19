-- AlterTable
ALTER TABLE "Transactions" ADD COLUMN     "transaction_no" TEXT,
ADD COLUMN     "utr" TEXT;

-- CreateTable
CREATE TABLE "Balance" (
    "id" TEXT NOT NULL,
    "vishubhBalance" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "kotalBalance" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Balance_pkey" PRIMARY KEY ("id")
);
