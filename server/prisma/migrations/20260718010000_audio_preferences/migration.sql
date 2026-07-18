CREATE TABLE "UserAudioPreference" (
  "userId" TEXT NOT NULL,
  "master" INTEGER NOT NULL DEFAULT 72,
  "music" INTEGER NOT NULL DEFAULT 34,
  "ui" INTEGER NOT NULL DEFAULT 64,
  "game" INTEGER NOT NULL DEFAULT 76,
  "muted" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserAudioPreference_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "UserAudioPreference"
  ADD CONSTRAINT "UserAudioPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
