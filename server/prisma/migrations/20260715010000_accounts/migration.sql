CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "usernameNormalized" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "avatarKey" TEXT,
  "tutorialCompleted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserStatistic" (
  "userId" TEXT NOT NULL,
  "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
  "gamesWon" INTEGER NOT NULL DEFAULT 0,
  "totalPenalty" INTEGER NOT NULL DEFAULT 0,
  "timeouts" INTEGER NOT NULL DEFAULT 0,
  "reconnects" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserStatistic_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "AchievementProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "achievement" TEXT NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "unlockedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AchievementProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_usernameNormalized_key" ON "User"("usernameNormalized");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE UNIQUE INDEX "AchievementProgress_userId_achievement_key" ON "AchievementProgress"("userId", "achievement");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserStatistic" ADD CONSTRAINT "UserStatistic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AchievementProgress" ADD CONSTRAINT "AchievementProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
