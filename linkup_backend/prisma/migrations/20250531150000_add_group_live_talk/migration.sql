-- CreateEnum
CREATE TYPE "GroupLiveRoomStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateTable
CREATE TABLE "GroupLiveRoom" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "status" "GroupLiveRoomStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupLiveRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupLiveParticipant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "GroupLiveParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupLiveRoom_groupId_status_idx" ON "GroupLiveRoom"("groupId", "status");

-- CreateIndex
CREATE INDEX "GroupLiveRoom_hostId_idx" ON "GroupLiveRoom"("hostId");

-- CreateIndex
CREATE INDEX "GroupLiveParticipant_roomId_idx" ON "GroupLiveParticipant"("roomId");

-- CreateIndex
CREATE INDEX "GroupLiveParticipant_userId_idx" ON "GroupLiveParticipant"("userId");

-- CreateIndex
CREATE INDEX "GroupLiveParticipant_roomId_leftAt_idx" ON "GroupLiveParticipant"("roomId", "leftAt");

-- AddForeignKey
ALTER TABLE "GroupLiveRoom" ADD CONSTRAINT "GroupLiveRoom_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupLiveRoom" ADD CONSTRAINT "GroupLiveRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupLiveParticipant" ADD CONSTRAINT "GroupLiveParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GroupLiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupLiveParticipant" ADD CONSTRAINT "GroupLiveParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
