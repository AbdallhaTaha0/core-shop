# Core Shop — single-container production image.
#
# For Back4app "Deploy a web app" with Root directory `./`: the platform
# detects this Dockerfile and builds both halves of the repo into one image.
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
# PORT is injected by the platform. `npm start` runs DB migrations first,
# so a fresh Neon database gets its schema on first boot.

# ---- client build (Vite -> dist/) ----
FROM node:24.18.0-bookworm-slim AS client-build
WORKDIR /client
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ---- shared base ----
FROM node:24.18.0-bookworm-slim AS base
WORKDIR /app

# ---- server dependencies (cached unless server/package.json changes) ----
FROM base AS server-deps
COPY server/package.json server/package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- server build (TypeScript -> dist/) ----
FROM base AS server-build
COPY --from=server-deps /app/node_modules ./node_modules
COPY server/ ./
RUN npm run build

# ---- production runtime ----
FROM base AS production
ENV NODE_ENV=production
ENV CLIENT_DIST_DIR=/app/client
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=server-build /app/dist ./dist
COPY --from=server-build /app/migrations ./migrations
COPY --from=server-build /app/.sequelizerc ./.sequelizerc
COPY --from=server-build /app/src/config/sequelize-cli.cjs ./src/config/sequelize-cli.cjs
COPY --from=client-build /client/dist ./client
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/health').then((r)=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["npm", "start"]
