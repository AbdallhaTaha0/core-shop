# Core Shop — Backend

Portfolio/learning e-commerce backend for a computer-parts store: catalog, cookie-JWT authentication,
guest + user carts with login merging, transactional checkout, orders, address book, admin
management, audit trail, and OpenAPI docs. Built as a modular monolith with production-quality
practices (validation, transactions, inventory safety, tested behavior — not just compilation).

> **Scope note:** the backend (`server/`) is the implementation target. `client/` exists as an
> intentionally incomplete placeholder for a future frontend — do not build the frontend here.
> `AGENTS.md` / `RULES.md` are local-only agent instructions and are git-ignored.

## Stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Runtime    | Node.js 24 LTS, TypeScript strict, Express 5                  |
| Database   | PostgreSQL 18 (Docker), Sequelize 6, migrations only          |
| Validation | Zod (strict schemas — unknown fields are rejected)            |
| Auth       | JWT in HttpOnly + SameSite=Lax cookies (+Secure in prod), bcrypt-12, Origin checks on cookie mutations |
| Testing    | Vitest + Supertest against an isolated `*_test` database      |
| Docs       | OpenAPI 3.0 JSON at `/api-docs.json`, Swagger UI at `/api-docs` |

Money is integer minor units (`priceCents`) end to end — never floats.

## Prerequisites

- Node.js 24 (`node --version` → v24.x) and npm
- Docker Desktop running (for PostgreSQL)

## Quickstart (from a fresh clone)

```bash
# 1. Backend dependencies (exact-pinned via package-lock.json)
cd server
npm ci
cd ..

# 2. Start PostgreSQL 18 (healthy when `docker compose ps` shows "healthy")
docker compose up -d db

# 3. Configure the backend (host-side development values)
cp server/.env.example server/.env

# 4. Migrate + demo data
cd server
npm run db:migrate
npm run db:seed
cd ..

# 5. Run the API
cd server
npm run dev
```

Verify:

- Health: `GET http://localhost:3000/api/v1/health` →
  `{"status":"ok","service":"core-shop-api","database":"connected"}`
- Interactive docs: `http://localhost:3000/api-docs`

> **Port already in use?** If a machine-local PostgreSQL occupies host port 5432, run the
> database on another host port instead — no file changes needed:
>
> ```bash
> DB_HOST_PORT=5433 docker compose up -d db
> ```
>
> Then point the backend and tests at it (see Environment below).

## Environment

All config lives in `server/.env` (never committed). Copy `server/.env.example` and adjust:

| Variable          | Example                                                        | Notes                                                        |
| ----------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| `NODE_ENV`        | `development`                                                  | `development` / `test` / `production`                        |
| `PORT`            | `3000`                                                         | API port                                                     |
| `DATABASE_URL`    | `postgres://coreshop:coreshop-dev-only@localhost:5432/coreshop` | Host-side dev URL (compose `api` service uses `db` host)     |
| `FRONTEND_ORIGIN` | `http://localhost:5173`                                        | Exact frontend origin for CORS (never a wildcard with credentials) |
| `JWT_SECRET`      | `dev-only-secret`                                              | Required in every environment; use a long random value in prod |
| `JWT_EXPIRES_IN`  | `15m`                                                          | `30s` / `15m` / `2h` / `7d` format                           |
| `TEST_DATABASE_URL` | `postgres://...@localhost:5432/coreshop_test`                | Isolated test DB (defaults to `coreshop_test` on 5432; override when using `DB_HOST_PORT`) |
| `DB_HOST_PORT`    | `5432`                                                         | Compose-only: host port mapped to the container (root env / shell) |

The app fails fast on invalid configuration at startup. `JWT_SECRET` is required everywhere
because the auth domain issues tokens.

## Scripts (run inside `server/`)

| Command                  | Purpose                                              |
| ------------------------ | ---------------------------------------------------- |
| `npm run dev`            | Dev server with reload (`tsx watch`)                 |
| `npm run build` / `start`| Compile (`tsconfig.build.json`) / run `dist/`       |
| `npm run typecheck`      | `tsc --noEmit` (src + tests)                         |
| `npm run lint`           | ESLint (strict TS, `any` banned)                     |
| `npm run format`         | Prettier check (`format:write` to fix)               |
| `npm test`               | Full suite (creates + migrates the test DB itself)   |
| `npm run test:watch`     | Suite in watch mode                                  |
| `npm run db:migrate`     | Apply pending migrations (dev DB from `DATABASE_URL`) |
| `npm run db:migrate:undo`| Revert last migration                                |
| `npm run db:migrate:status` | Show applied/pending migrations                   |
| `npm run db:migrate:test`| Migrate the test DB explicitly                       |
| `npm run db:seed`        | Demo catalog (skips silently if data exists)         |

Verification checklist for every change: `typecheck` → `lint` → `format` → `test`,
plus migration + live-API checks when the change touches the DB or routes.

## Tests

```bash
cd server
npm test                                   # standard port 5432
TEST_DATABASE_URL=postgres://coreshop:coreshop-dev-only@127.0.0.1:5433/coreshop_test npm test
```

- Test files run sequentially (`fileParallelism: false`) sharing one isolated `*_test`
  database; a global setup creates the DB and migrates it, so fresh clone + `npm test` works.
- Every suite truncates via a single FK-safe `truncateAll()` guarded to `*_test` databases —
  a misconfigured `DATABASE_URL` can never wipe development data.
- Payment outcomes are mocked per-file (`vi.mock` of the payment provider): approval is the
  default, decline/rollback paths are injected where tested.

## Project structure

```text
core-shop/
├── docker-compose.yml      # db (postgres:18.x pinned) + api services
├── server/
│   ├── src/
│   │   ├── config/         # env validation, sequelize-cli config
│   │   ├── controllers/    # thin HTTP adapters (no business logic)
│   │   ├── middleware/     # auth, authorize, cart, CORS-adjacent, errors
│   │   ├── models/         # Sequelize models; associations ONLY in index.ts
│   │   ├── routes/         # endpoint + middleware composition (no logic)
│   │   ├── services/       # business rules and workflows
│   │   ├── schemas/        # Zod contracts (DTOs inferred, strict = no mass assignment)
│   │   ├── docs/           # hand-maintained OpenAPI document
│   │   ├── utils/          # errors, JWT, cookies, slugs, password
│   │   ├── types/          # Express augmentations (req.user, validatedQuery, cart)
│   │   ├── app.ts          # middleware stack + docs mounting
│   │   └── server.ts       # fail-fast boot + graceful shutdown
│   ├── tests/              # *.test.ts + helpers + global-setup
│   ├── migrations/         # schema changes only (never edit applied ones)
│   ├── seeders/            # deterministic demo data
│   └── .env.example        # safe placeholders
└── client/                 # FUTURE frontend placeholder — do not implement here
```

Request flow: `Route → Middleware → Zod validation → Controller → Service → Sequelize → PostgreSQL`.

## API overview (`/api/v1`)

| Area      | Endpoints |
| --------- | --------- |
| Health    | `GET /health` (200 ok / 503 degraded with DB check) |
| Auth      | `POST /auth/register` (201, auto-login) · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` |
| Addresses | `GET /addresses` · `POST /addresses` · `PATCH /addresses/:id` · `DELETE /addresses/:id` (strictly own) |
| Cart      | `GET /cart` · `POST /cart/items` · `PATCH /cart/items/:id` · `DELETE /cart/items/:id` (guest cookie or session; login auto-merges) |
| Checkout  | `POST /checkout` (body: only optional `addressId`; totals always server-computed) |
| Orders    | `GET /orders` · `GET /orders/:id` (own only; others → 404) |
| Catalog   | `GET /products` (search/filter/sort/paginate) · `GET /products/:slug` · `GET /categories` · `GET /brands` |
| Admin     | `/admin/products`, `/admin/categories`, `/admin/brands` (CRUD) · `/admin/orders` + status machine · `/admin/users` + role changes (never your own) · `/admin/audit-logs` |

Errors share one shape: `{ "error": { "code": "SOME_CODE", "message": "...", "details": {} } }`.
Production responses never leak stack traces or internals. Full reference with schemas:
`/api-docs`.

## Conventions for continuing the work

1. **Migrations only** — never `sequelize.sync({ alter: true })`; never edit an applied
   migration, always add a new one. Verify with `db:migrate`, `:undo`, `:status`.
2. **Money** stays integer minor units everywhere (products → cart → orders).
3. **Historical data is immutable** — order items and shipping snapshots are written once;
   later catalog edits must never rewrite them.
4. **Never trust the client** — prices, totals, roles, stock, statuses are derived
   server-side; schemas are strict; ownership is checked per row (`404`, never another
   user's data).
5. **Inventory changes happen inside transactions** with row locks (`SELECT … FOR UPDATE`
   in sorted-id order); checkout refunds on late failure so a charge never exists without an order.
6. **AuthN ≠ AuthZ** — `authenticate` answers who, `requireRole` answers allowed; roles come
   only from the verified session. Role changes take effect on next login (JWT carries the role).
7. **Audit security-relevant changes** via `recordAudit` (fail-open, never blocks flows).
8. **Docs are code** — new/changed endpoints must update `src/docs/openapi.ts`
   (`tests/docs.test.ts` guards every path).
9. Keep changes small, keep `client/` untouched, and run the verification checklist.

## Troubleshooting

| Symptom | Likely cause / fix |
| ------- | ------------------ |
| `docker compose up db` fails to bind 5432 | Local Postgres holds the port → use `DB_HOST_PORT=5433` and point `DATABASE_URL`/`TEST_DATABASE_URL` at 5433 |
| `db` container `unhealthy` on first pull | Wait for the healthcheck (`pg_isready`); check `docker logs core-shop-db` |
| Tests hit the dev DB / refuse to run | `truncateAll` only allows `*_test` databases — set `TEST_DATABASE_URL` correctly |
| `bcrypt` install issues | Native module with prebuilds; ensure Node 24 and retry `npm ci` |
| `CREATE EXTENSION pg_trgm` fails | Needs a superuser (true for the compose default user); managed DBs may need a grant |
| Suite is slow (~1 min) | Expected: bcrypt cost 12 per hash; files run sequentially by design |
| Login works but admin routes 403 after promotion | By design: re-login so the new role lands in a fresh token |
