-- Add Hub MODERATOR role and Live Talk session admin fields
ALTER TYPE "GroupRole" ADD VALUE 'MODERATOR';

CREATE TYPE "GroupLiveRole" AS ENUM ('LISTENER', 'SPEAKER', 'TEMP_ADMIN');

ALTER TABLE "GroupLiveParticipant" ADD COLUMN "liveRole" "GroupLiveRole" NOT NULL DEFAULT 'LISTENER';
ALTER TABLE "GroupLiveParticipant" ADD COLUMN "isTempAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GroupLiveParticipant" ADD COLUMN "tempAdminGrantedBy" TEXT;
ALTER TABLE "GroupLiveParticipant" ADD COLUMN "tempAdminGrantedAt" TIMESTAMP(3);
