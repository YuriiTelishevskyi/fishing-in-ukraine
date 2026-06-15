-- CreateEnum
CREATE TYPE "CatchReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "CatchReport" (
    "id" TEXT NOT NULL,
    "waterId" TEXT NOT NULL,
    "fishId" INTEGER NOT NULL,
    "caughtAt" DATE NOT NULL,
    "comment" TEXT,
    "photoUrl" TEXT,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT,
    "status" "CatchReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatchReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatchReport_waterId_status_caughtAt_idx" ON "CatchReport"("waterId", "status", "caughtAt");

-- CreateIndex
CREATE INDEX "CatchReport_status_idx" ON "CatchReport"("status");

-- AddForeignKey
ALTER TABLE "CatchReport" ADD CONSTRAINT "CatchReport_waterId_fkey" FOREIGN KEY ("waterId") REFERENCES "Water"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatchReport" ADD CONSTRAINT "CatchReport_fishId_fkey" FOREIGN KEY ("fishId") REFERENCES "FishSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
