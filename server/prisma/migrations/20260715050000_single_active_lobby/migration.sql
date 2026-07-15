WITH ranked_memberships AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY "joinedAt" DESC, "id" DESC
    ) AS position
  FROM "LobbyPlayer"
)
DELETE FROM "LobbyPlayer"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_memberships
  WHERE position > 1
);

DELETE FROM "Lobby"
WHERE NOT EXISTS (
  SELECT 1
  FROM "LobbyPlayer"
  WHERE "LobbyPlayer"."lobbyId" = "Lobby"."id"
);

UPDATE "Lobby" AS lobby
SET "hostId" = (
  SELECT player."userId"
  FROM "LobbyPlayer" AS player
  WHERE player."lobbyId" = lobby."id"
  ORDER BY player."joinedAt" ASC, player."id" ASC
  LIMIT 1
)
WHERE NOT EXISTS (
  SELECT 1
  FROM "LobbyPlayer" AS current_host
  WHERE current_host."lobbyId" = lobby."id"
    AND current_host."userId" = lobby."hostId"
);

CREATE UNIQUE INDEX "LobbyPlayer_userId_key" ON "LobbyPlayer"("userId");
