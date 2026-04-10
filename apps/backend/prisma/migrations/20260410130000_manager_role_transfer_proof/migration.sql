-- Add MANAGER value to UserRole enum
ALTER TYPE "UserRole" ADD VALUE 'MANAGER';

-- Add transferProofUrl to payments
ALTER TABLE "payments"
  ADD COLUMN "transferProofUrl" TEXT;
