-- CreateEnum
CREATE TYPE "OccupancyType" AS ENUM ('OWNER', 'TENANT');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'MOTORCYCLE', 'TRUCK', 'VAN', 'OTHER');

-- CreateEnum
CREATE TYPE "MemberRelationship" AS ENUM ('SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'RELATIVE', 'CARETAKER', 'EMPLOYEE', 'PARTNER', 'OTHER');

-- AlterTable community_users: add community-scoped contact fields
ALTER TABLE "community_users"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "emergencyContactName" TEXT,
  ADD COLUMN "emergencyContactPhone" TEXT,
  ADD COLUMN "emergencyContactRelation" TEXT;

-- AlterTable units: add owner info + emergency contact
ALTER TABLE "units"
  ADD COLUMN "ownerName" TEXT,
  ADD COLUMN "ownerPhone" TEXT,
  ADD COLUMN "ownerEmail" TEXT,
  ADD COLUMN "emergencyContactName" TEXT,
  ADD COLUMN "emergencyContactPhone" TEXT,
  ADD COLUMN "emergencyContactRelation" TEXT;

-- AlterTable unit_residents: add occupancy type (owner vs tenant)
ALTER TABLE "unit_residents"
  ADD COLUMN "occupancyType" "OccupancyType" NOT NULL DEFAULT 'OWNER';

-- AlterTable payments: add cash/manual payment tracking
ALTER TABLE "payments"
  ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'STRIPE',
  ADD COLUMN "cashReceivedById" TEXT,
  ADD COLUMN "cashNotes" TEXT;

-- CreateTable household_members
CREATE TABLE "household_members" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "relationship" "MemberRelationship" NOT NULL DEFAULT 'OTHER',
  "phone" TEXT,
  "email" TEXT,
  "idDocument" TEXT,
  "canGrantAccess" BOOLEAN NOT NULL DEFAULT false,
  "photoUrl" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "household_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable vehicles
CREATE TABLE "vehicles" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "type" "VehicleType" NOT NULL DEFAULT 'CAR',
  "make" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "year" INTEGER,
  "color" TEXT NOT NULL,
  "plateNumber" TEXT NOT NULL,
  "sticker" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "household_members_communityId_unitId_idx" ON "household_members"("communityId", "unitId");

-- CreateIndex
CREATE INDEX "vehicles_communityId_plateNumber_idx" ON "vehicles"("communityId", "plateNumber");

-- CreateIndex
CREATE INDEX "vehicles_communityId_unitId_idx" ON "vehicles"("communityId", "unitId");

-- AddForeignKey
ALTER TABLE "household_members"
  ADD CONSTRAINT "household_members_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
