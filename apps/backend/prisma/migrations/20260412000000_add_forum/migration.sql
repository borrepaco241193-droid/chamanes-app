-- CreateTable: Community Forum

CREATE TABLE "forum_posts" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "forum_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "forum_likes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "forum_posts_communityId_createdAt_idx" ON "forum_posts"("communityId", "createdAt");

-- CreateIndex (unique like per user per post)
CREATE UNIQUE INDEX "forum_likes_postId_userId_key" ON "forum_likes"("postId", "userId");

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "forum_comments" ADD CONSTRAINT "forum_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "forum_comments" ADD CONSTRAINT "forum_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "forum_likes" ADD CONSTRAINT "forum_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "forum_likes" ADD CONSTRAINT "forum_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
