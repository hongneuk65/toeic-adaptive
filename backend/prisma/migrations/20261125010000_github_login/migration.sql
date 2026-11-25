-- Stable GitHub account id for "Đăng nhập bằng GitHub"; email may change on GitHub.
ALTER TABLE "User" ADD COLUMN "githubId" TEXT;

CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");
