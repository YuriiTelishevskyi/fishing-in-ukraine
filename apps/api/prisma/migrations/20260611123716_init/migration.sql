-- CreateEnum
CREATE TYPE "WaterType" AS ENUM ('LAKE', 'POND', 'RIVER', 'RESERVOIR', 'FISHING_COMPLEX');

-- CreateEnum
CREATE TYPE "WaterStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Region" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FishSpecies" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,

    CONSTRAINT "FishSpecies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amenity" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Water" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "regionId" INTEGER NOT NULL,
    "district" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "areaHa" DOUBLE PRECISION,
    "waterType" "WaterType" NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "priceFrom" INTEGER,
    "priceTo" INTEGER,
    "priceNote" TEXT,
    "priceNoteEn" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "rules" TEXT,
    "rulesEn" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "WaterStatus" NOT NULL DEFAULT 'DRAFT',
    "seoTitle" TEXT,
    "seoTitleEn" TEXT,
    "seoDescription" TEXT,
    "seoDescriptionEn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Water_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterFish" (
    "waterId" TEXT NOT NULL,
    "fishId" INTEGER NOT NULL,

    CONSTRAINT "WaterFish_pkey" PRIMARY KEY ("waterId","fishId")
);

-- CreateTable
CREATE TABLE "WaterAmenity" (
    "waterId" TEXT NOT NULL,
    "amenityId" INTEGER NOT NULL,

    CONSTRAINT "WaterAmenity_pkey" PRIMARY KEY ("waterId","amenityId")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "waterId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_slug_key" ON "Region"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FishSpecies_slug_key" ON "FishSpecies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_slug_key" ON "Amenity"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Water_slug_key" ON "Water"("slug");

-- CreateIndex
CREATE INDEX "Water_regionId_status_idx" ON "Water"("regionId", "status");

-- CreateIndex
CREATE INDEX "Water_status_idx" ON "Water"("status");

-- AddForeignKey
ALTER TABLE "Water" ADD CONSTRAINT "Water_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterFish" ADD CONSTRAINT "WaterFish_waterId_fkey" FOREIGN KEY ("waterId") REFERENCES "Water"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterFish" ADD CONSTRAINT "WaterFish_fishId_fkey" FOREIGN KEY ("fishId") REFERENCES "FishSpecies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterAmenity" ADD CONSTRAINT "WaterAmenity_waterId_fkey" FOREIGN KEY ("waterId") REFERENCES "Water"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterAmenity" ADD CONSTRAINT "WaterAmenity_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_waterId_fkey" FOREIGN KEY ("waterId") REFERENCES "Water"("id") ON DELETE CASCADE ON UPDATE CASCADE;
