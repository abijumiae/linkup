-- Privacy fields on User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileVisibility" TEXT NOT NULL DEFAULT 'public';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "messagePermission" TEXT NOT NULL DEFAULT 'everyone';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "showOnlineStatus" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "showCountry" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "showActivity" BOOLEAN NOT NULL DEFAULT true;

-- Report updatedAt
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Extend Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MODERATOR';

-- Extend ReportTargetType enum
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'COMMENT';
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'GROUP';
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'MARKET';
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'JOB';
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'EVENT';

-- Extend ReportStatus enum
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'REVIEWING';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'RESOLVED';

-- Moderation audit log
CREATE TABLE IF NOT EXISTS "ModerationLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ModerationLog_adminId_idx" ON "ModerationLog"("adminId");
CREATE INDEX IF NOT EXISTS "ModerationLog_targetType_idx" ON "ModerationLog"("targetType");
CREATE INDEX IF NOT EXISTS "ModerationLog_targetId_idx" ON "ModerationLog"("targetId");
CREATE INDEX IF NOT EXISTS "ModerationLog_createdAt_idx" ON "ModerationLog"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ModerationLog_adminId_fkey'
  ) THEN
    ALTER TABLE "ModerationLog"
      ADD CONSTRAINT "ModerationLog_adminId_fkey"
      FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
