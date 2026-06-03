-- Track participant presence for Live Talk reconnect / heartbeat
ALTER TABLE "GroupLiveParticipant" ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
