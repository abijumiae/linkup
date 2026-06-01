-- Open mic state for group live talk rooms
ALTER TABLE "GroupLiveRoom" ADD COLUMN IF NOT EXISTS "activeMicUserId" TEXT;
ALTER TABLE "GroupLiveRoom" ADD COLUMN IF NOT EXISTS "activeMicStartedAt" TIMESTAMP(3);

ALTER TABLE "GroupLiveRoom" DROP CONSTRAINT IF EXISTS "GroupLiveRoom_activeMicUserId_fkey";
ALTER TABLE "GroupLiveRoom" ADD CONSTRAINT "GroupLiveRoom_activeMicUserId_fkey"
  FOREIGN KEY ("activeMicUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "GroupLiveRoom_activeMicUserId_idx" ON "GroupLiveRoom"("activeMicUserId");

ALTER TABLE "GroupLiveParticipant" ALTER COLUMN "isMuted" SET DEFAULT true;
