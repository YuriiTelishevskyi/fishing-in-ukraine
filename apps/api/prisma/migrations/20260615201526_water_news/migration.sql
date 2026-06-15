-- CreateEnum
CREATE TYPE "WaterNewsType" AS ENUM ('STOCKING', 'NEWS');

-- CreateTable
CREATE TABLE "WaterNews" (
    "id" TEXT NOT NULL,
    "waterId" TEXT NOT NULL,
    "type" "WaterNewsType" NOT NULL DEFAULT 'NEWS',
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "body" TEXT,
    "bodyEn" TEXT,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterNews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaterNews_waterId_date_idx" ON "WaterNews"("waterId", "date");

-- AddForeignKey
ALTER TABLE "WaterNews" ADD CONSTRAINT "WaterNews_waterId_fkey" FOREIGN KEY ("waterId") REFERENCES "Water"("id") ON DELETE CASCADE ON UPDATE CASCADE;
