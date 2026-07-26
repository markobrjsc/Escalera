ALTER TABLE "User"
ADD COLUMN "tutorialStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tutorialReadMask" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "User"
ADD CONSTRAINT "User_tutorialStep_range" CHECK ("tutorialStep" BETWEEN 0 AND 15),
ADD CONSTRAINT "User_tutorialReadMask_range" CHECK ("tutorialReadMask" BETWEEN 0 AND 65535);
