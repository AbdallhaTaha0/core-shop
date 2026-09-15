# ---- base ----
FROM node:24.18.0-bookworm-slim AS base
WORKDIR /app

# ---- dependencies (cached unless package.json changes) ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- production runtime ----
# Back4app / Neon notes:
# - Environment comes from the platform (DATABASE_URL, JWT_SECRET, ...);
#   no .env file is baked in (see .dockerignore).
# - `npm start` runs `sequelize-cli db:migrate` first so a fresh Neon
#   database gets its schema on first boot; migrations are idempotent.
FROM base AS production
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/.sequelizerc ./.sequelizerc
COPY --from=build /app/src/config/sequelize-cli.cjs ./src/config/sequelize-cli.cjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/health').then((r)=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["npm", "start"]
