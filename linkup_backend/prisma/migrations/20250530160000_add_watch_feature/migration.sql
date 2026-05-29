-- CreateTable
CREATE TABLE "WatchVideo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "category" TEXT,
    "type" TEXT,
    "duration" INT,
    "creatorId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WatchVideo_isPublished_createdAt_idx" ON "WatchVideo"("isPublished", "createdAt");

-- CreateIndex
CREATE INDEX "WatchVideo_category_idx" ON "WatchVideo"("category");

-- CreateIndex
CREATE INDEX "WatchVideo_type_idx" ON "WatchVideo"("type");

-- CreateIndex
CREATE INDEX "WatchProgress_userId_updatedAt_idx" ON "WatchProgress"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WatchProgress_userId_videoId_key" ON "WatchProgress"("userId", "videoId");

-- AddForeignKey
ALTER TABLE "WatchVideo" ADD CONSTRAINT "WatchVideo_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchProgress" ADD CONSTRAINT "WatchProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchProgress" ADD CONSTRAINT "WatchProgress_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "WatchVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
