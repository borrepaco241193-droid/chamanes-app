-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "manual_visits" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "registeredById" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "passengers" INTEGER,
    "unitNumber" TEXT NOT NULL,
    "hostName" TEXT NOT NULL,
    "ineName" TEXT,
    "inePhotoUrl" TEXT,
    "plateText" TEXT,
    "platePhotoUrl" TEXT,
    "carModel" TEXT,
    "carColor" TEXT,
    "isInside" BOOLEAN NOT NULL DEFAULT true,
    "entryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitAt" TIMESTAMP(3),

    CONSTRAINT "manual_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "manual_visits_communityId_isInside_idx" ON "manual_visits"("communityId", "isInside");

-- CreateIndex
CREATE INDEX "manual_visits_communityId_entryAt_idx" ON "manual_visits"("communityId", "entryAt");

-- AddForeignKey
ALTER TABLE "manual_visits" ADD CONSTRAINT "manual_visits_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_visits" ADD CONSTRAINT "manual_visits_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
