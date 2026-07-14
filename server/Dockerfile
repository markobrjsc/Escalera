FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/game-rules/package.json packages/game-rules/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY server server
RUN npm run build --workspace=@escalera/server

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/game-rules/package.json packages/game-rules/package.json
RUN npm ci --omit=dev --workspace=@escalera/server

COPY --from=build /app/server/dist server/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD node -e "fetch('http://localhost:3000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server/dist/main.js"]
