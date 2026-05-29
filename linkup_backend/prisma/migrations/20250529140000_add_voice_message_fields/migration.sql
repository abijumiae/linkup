-- AlterTable
ALTER TABLE "Message" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "Message" ADD COLUMN "mediaUrl" TEXT;
ALTER TABLE "Message" ADD COLUMN "mediaType" TEXT;
ALTER TABLE "Message" ADD COLUMN "duration" INTEGER;
ALTER TABLE "Message" ALTER COLUMN "content" SET DEFAULT '';
