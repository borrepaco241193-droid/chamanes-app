-- Add idVerificationStatus and idVerificationNote to users

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "idVerificationStatus" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN IF NOT EXISTS "idVerificationNote" TEXT;

-- Backfill existing rows based on current state
-- Users with idVerified=true => APPROVED
UPDATE "users" SET "idVerificationStatus" = 'APPROVED' WHERE "idVerified" = true;
-- Users with idPhotoUrl set but not verified => PENDING
UPDATE "users" SET "idVerificationStatus" = 'PENDING' WHERE "idVerified" = false AND "idPhotoUrl" IS NOT NULL;
