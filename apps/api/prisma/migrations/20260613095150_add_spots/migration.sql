-- CreateEnum
CREATE TYPE "SpotStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Spot" (
    "id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT,
    "title" TEXT,
    "comment" TEXT NOT NULL,
    "fishNote" TEXT,
    "photoUrl" TEXT,
    "status" "SpotStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Spot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Spot_status_idx" ON "Spot"("status");
