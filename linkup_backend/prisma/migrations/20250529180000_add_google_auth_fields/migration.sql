-- AlterEnum
ALTER TYPE "AccountType" ADD VALUE IF NOT EXISTS 'STUDENT';
ALTER TYPE "AccountType" ADD VALUE IF NOT EXISTS 'PROFESSIONAL';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isOnboarded" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");

-- Mark existing local users as onboarded
UPDATE "User" SET "isOnboarded" = true WHERE "provider" = 'local' OR "googleId" IS NULL;
