-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isEmailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationExpires" TIMESTAMP(3);

-- Existing accounts are treated as verified
UPDATE "User" SET "isEmailVerified" = true WHERE "provider" = 'local' OR "googleId" IS NOT NULL;
