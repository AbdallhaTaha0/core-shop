# Core Shop — single-container production image (2 stages, Small-tier friendly).
#
# For SnapDeploy / Back4app "Deploy a web app" with Root directory `./`.
# The Express API serves the built Vite frontend same-origin:
#   API        -> /api/v1/*, /api-docs
#   Frontend   -> everything else (SPA fallback to index.html)
#   Health     -> /api/v1/health
#
# Environment comes from the platform (never baked in — see .dockerignore):
#   NODE_ENV=production
#   DATABASE_URL=<Neon pooled URL, must end with ?sslmode=require>
#   FRONTEND_ORIGIN=<this app's own public URL>
#   JWT_SECRET=<long random string>
#   JWT_EXPIRES_IN=15m
# PORT is injected by the platform (defaults to 3000). `npm start` runs DB
# migrations first, so a fresh Neon database gets its schema on first boot.

# ---- Stage 1: build both halves (discarded after build) ----
FROM node:24.18.0-bookworm-slim AS build
WORKDIR /build
# Install dependencies first for better layer caching.
COPY client/package.json client/package-lock.json ./client/
RUN npm ci --prefix client --no-audit --no-fund
COPY server/package.json server/package-lock.json ./server/
RUN npm ci --prefix server --no-audit --no-fund
# Build the frontend (Vite -> client/dist/).
COPY client/ ./client/
RUN npm run build --prefix client
# Build the API (TypeScript -> server/dist/).
COPY server/ ./server/
RUN npm run build --prefix server

# ---- Stage 2: slim production runtime ----
FROM node:24.18.0-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
ENV CLIENT_DIST_DIR=/app/client
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /build/server/dist ./dist
COPY --from=build /build/server/migrations ./migrations
COPY --from=build /build/server/.sequelizerc ./.sequelizerc
COPY --from=build /build/server/src/config/sequelize-cli.cjs ./src/config/sequelize-cli.cjs
COPY --from=build /build/client/dist ./client
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/health').then((r)=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["npm", "start"]
