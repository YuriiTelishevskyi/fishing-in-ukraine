-- AlterTable
ALTER TABLE "Water" ADD COLUMN     "riverId" INTEGER;

-- CreateTable
CREATE TABLE "River" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,

    CONSTRAINT "River_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "River_slug_key" ON "River"("slug");

-- AddForeignKey
ALTER TABLE "Water" ADD CONSTRAINT "Water_riverId_fkey" FOREIGN KEY ("riverId") REFERENCES "River"("id") ON DELETE SET NULL ON UPDATE CASCADE;
