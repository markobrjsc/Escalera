ALTER TABLE "UserAudioPreference"
  ADD COLUMN "effects" INTEGER NOT NULL DEFAULT 72;

UPDATE "UserAudioPreference"
SET "effects" = ROUND(("ui" + "game") / 2.0);

ALTER TABLE "UserAudioPreference"
  ALTER COLUMN "music" SET DEFAULT 60,
  DROP COLUMN "master",
  DROP COLUMN "ui",
  DROP COLUMN "game";
