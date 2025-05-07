/*
  Warnings:

  - Added the required column `chargesAmount` to the `Transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transactions" ADD COLUMN     "chargesAmount" DECIMAL(65,30) NOT NULL;
