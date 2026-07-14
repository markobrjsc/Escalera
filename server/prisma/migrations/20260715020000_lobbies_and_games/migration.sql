CREATE TYPE "LobbyStatus" AS ENUM ('OPEN', 'ACTIVE', 'CLOSED');
CREATE TYPE "GameStatus" AS ENUM ('ACTIVE', 'FINISHED');

CREATE TABLE "Lobby" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "status" "LobbyStatus" NOT NULL DEFAULT 'OPEN',
  "maxPlayers" INTEGER NOT NULL DEFAULT 6,
  "jokersPerPlayer" INTEGER NOT NULL DEFAULT 1,
  "maxTurnSeconds" INTEGER,
  "streetsRequireSameSuit" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "Lobby_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LobbyPlayer" (
  "id" TEXT NOT NULL,
  "lobbyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ready" BOOLEAN NOT NULL DEFAULT false,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LobbyPlayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Game" (
  "id" TEXT NOT NULL,
  "lobbyId" TEXT NOT NULL,
  "status" "GameStatus" NOT NULL DEFAULT 'ACTIVE',
  "phase" INTEGER NOT NULL DEFAULT 1,
  "version" INTEGER NOT NULL DEFAULT 1,
  "state" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Lobby_code_key" ON "Lobby"("code");
CREATE UNIQUE INDEX "LobbyPlayer_lobbyId_userId_key" ON "LobbyPlayer"("lobbyId", "userId");
CREATE INDEX "LobbyPlayer_userId_idx" ON "LobbyPlayer"("userId");
CREATE UNIQUE INDEX "Game_lobbyId_key" ON "Game"("lobbyId");

ALTER TABLE "Lobby" ADD CONSTRAINT "Lobby_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LobbyPlayer" ADD CONSTRAINT "LobbyPlayer_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LobbyPlayer" ADD CONSTRAINT "LobbyPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
