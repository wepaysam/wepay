-- CreateTable
CREATE TABLE "public"."CronLock" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CronLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CronLock_jobName_key" ON "public"."CronLock"("jobName");
