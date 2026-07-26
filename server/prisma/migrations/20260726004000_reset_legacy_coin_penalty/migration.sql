-- The previous meaning of coinPenalty was a penalty charged for remaining
-- coins. It now stores points actually compensated by remaining coins.
-- Historical aggregates cannot be converted safely per game, so discard the
-- incompatible aggregate and its derived achievement unlocks.
UPDATE "UserStatistic"
SET "coinPenalty" = 0;

DELETE FROM "AchievementProgress"
WHERE "achievement" LIKE 'coins:%';
