-- AlterTable
ALTER TABLE "users" ADD COLUMN     "idPhotoUrl" TEXT,
ADD COLUMN     "idVerified" BOOLEAN NOT NULL DEFAULT false;
