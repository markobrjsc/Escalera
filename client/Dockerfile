FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/game-rules/package.json packages/game-rules/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY client client
COPY packages packages
RUN npm run build --workspace=@escalera/client

FROM nginx:1.27-alpine AS production
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY infrastructure/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/api/health >/dev/null 2>&1 || exit 1
