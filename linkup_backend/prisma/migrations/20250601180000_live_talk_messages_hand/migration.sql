-- AlterTable
ALTER TABLE "GroupLiveParticipant" ADD COLUMN "handRaised" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GroupLiveTalkMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupLiveTalkMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupLiveTalkMessage_roomId_createdAt_idx" ON "GroupLiveTalkMessage"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "GroupLiveTalkMessage" ADD CONSTRAINT "GroupLiveTalkMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GroupLiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupLiveTalkMessage" ADD CONSTRAINT "GroupLiveTalkMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
