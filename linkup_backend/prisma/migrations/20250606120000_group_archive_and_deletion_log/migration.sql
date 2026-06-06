-- Archive support + permanent delete audit trail
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Group_archivedAt_idx" ON "Group"("archivedAt");

CREATE TABLE IF NOT EXISTS "GroupDeletionLog" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "groupName" TEXT NOT NULL,
  "deletedById" TEXT NOT NULL,
  "deletedByEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupDeletionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GroupDeletionLog_deletedById_idx" ON "GroupDeletionLog"("deletedById");
CREATE INDEX IF NOT EXISTS "GroupDeletionLog_groupId_idx" ON "GroupDeletionLog"("groupId");
CREATE INDEX IF NOT EXISTS "GroupDeletionLog_createdAt_idx" ON "GroupDeletionLog"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GroupDeletionLog_deletedById_fkey'
  ) THEN
    ALTER TABLE "GroupDeletionLog"
      ADD CONSTRAINT "GroupDeletionLog_deletedById_fkey"
      FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
