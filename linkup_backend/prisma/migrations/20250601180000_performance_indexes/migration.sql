-- Feed and hub timeline queries
CREATE INDEX IF NOT EXISTS "Post_groupId_createdAt_idx" ON "Post"("groupId", "createdAt" DESC);

-- Comment lists ordered by time
CREATE INDEX IF NOT EXISTS "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");
