# Core Shop — Backend OpenCode Specification

> **Companion files:** Read `AGENTS.md` and `RULES.md` before this document.
>
> `AGENTS.md` defines how the AI coding agent operates. `RULES.md` defines engineering constraints. This document defines the Core Shop backend requirements.

## 0. CRITICAL SCOPE: BACKEND IMPLEMENTATION ONLY

This document is the implementation specification for the **Core Shop backend**.

The repository may contain a `client/` directory and this specification intentionally describes some future frontend-facing behavior so the backend architecture and API contracts are designed correctly.

### Non-negotiable implementation boundary

- **Work only on the backend and backend infrastructure.**
- The primary implementation area is `server/`.
- Docker/Compose configuration may be changed when required to run backend infrastructure such as PostgreSQL.
- **Do NOT implement, modify, refactor, initialize, or redesign the frontend in `client/`.**
- Do NOT create frontend pages, components, hooks, state management, styling, frontend routing, or frontend API clients.
- Do NOT choose a frontend framework or make frontend architectural decisions.
- Do NOT invent missing frontend requirements.
- Do NOT treat the frontend information below as a request to build the frontend.
- You MAY use the future frontend behavior described below to design clean, stable, appropriate backend API contracts.
- When a backend requirement is unclear, prefer a sensible production-quality API design and document the assumption rather than creating frontend work.

The frontend is intentionally incomplete and will be specified and implemented later.

---

# 1. Project Context

Core Shop is a portfolio/learning full-stack e-commerce project for a computer-parts store.

It is not intended to operate as a real commercial store, but it should be engineered using production-quality practices because the project is intended to demonstrate professional backend engineering skills.

The goal is to practice:

- API design
- authentication and authorization
- database modeling
- transactions
- inventory handling
- validation
- security
- testing
- migrations
- maintainability
- SEO-supporting API/data design
- Dockerized development
- clean architecture

Do not over-engineer the project. Use a **modular monolith** unless a real requirement clearly justifies another architecture.

---

# 2. Backend Technology Baseline

Use these technologies unless a strong technical reason requires a documented change.

- Node.js **24 LTS**
- TypeScript with strict configuration
- Express **5.x**
- Sequelize **6.x stable**
- PostgreSQL **18.x**
- Docker / Docker Compose
- Zod for runtime validation and DTO inference
- JWT authentication
- JWT stored in properly configured HttpOnly cookies
- Automated API testing
- ESLint / formatting tooling where appropriate
- npm with a committed `package-lock.json`

Prefer explicit stable patch versions rather than floating `latest` tags.

Security version policy:

- Use supported stable versions.
- Use the latest secure patch release available within the selected major version when implementing/updating dependencies.
- Keep the lockfile committed.
- Regularly audit dependencies.
- Never blindly use `npm audit fix --force` if it causes unnecessary breaking upgrades.
- No dependency version can guarantee zero future vulnerabilities; the goal is a maintainable, supported, auditable dependency set.

---

# 3. Repository Structure

Expected repository shape:

```text
core-shop/
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── schemas/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   ├── migrations/
│   ├── seeders/
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
└── docker-compose.yml
```

This is a target structure, not permission to overwrite existing work blindly.

Before modifying anything:

1. Inspect the repository.
2. Identify existing backend work.
3. Preserve useful existing work.
4. Avoid unnecessary rewrites.
5. Adapt the structure if the existing implementation is already sound.

---

# 4. Architectural Pattern

Use this request flow:

```text
HTTP Request
    ↓
Route
    ↓
Middleware
    ↓
Zod Validation
    ↓
Controller
    ↓
Service
    ↓
Sequelize Model / Data Access
    ↓
PostgreSQL
```

Responsibilities:

### Routes

- Define endpoints.
- Attach appropriate middleware.
- Do not contain business logic.

### Middleware

Handle cross-cutting concerns such as:

- authentication
- authorization
- validation
- rate limiting
- security
- request context
- error handling

### Controllers

Controllers should be thin.

They should:

- receive validated input
- call services
- return appropriate HTTP responses

Do not put substantial business logic in controllers.

### Services

Services contain business rules and workflows.

Examples:

- registration
- login
- cart merging
- inventory checks
- price calculation
- checkout
- order creation
- authorization-sensitive operations

### Models

Sequelize models represent persistence/domain data.

The assistant/OpenCode is responsible for carefully designing the Sequelize models, relationships, constraints, indexes, defaults, nullable fields, deletion behavior, and relevant database behavior.

Do not create giant generic models or generic repositories without a real need.

---

# 5. Validation and DTOs

Use Zod for all external input validation.

Example pattern:

```ts
const CreateProductSchema = z.object({
  // ...
});

type CreateProductDto = z.infer<typeof CreateProductSchema>;
```

Expected schema organization:

```text
src/schemas/
├── auth.schema.ts
├── user.schema.ts
├── product.schema.ts
├── category.schema.ts
├── brand.schema.ts
├── cart.schema.ts
├── order.schema.ts
└── checkout.schema.ts
```

Validate relevant:

- request bodies
- query parameters
- route parameters
- cookies/headers where applicable

Never trust client-supplied:

- prices
- totals
- roles
- permissions
- stock values
- order status
- privileged fields

Reject unknown/suspicious fields where appropriate to prevent mass assignment.

Do not use `any` as a shortcut around validation or typing.

---

# 6. Database and Sequelize

PostgreSQL is the primary database.

Use Sequelize 6 stable.

### Do NOT use

```ts
sequelize.sync({ alter: true });
```

as the production schema-management strategy.

Use migrations.

The expected lifecycle is:

```text
Fresh database
    ↓
Run migrations
    ↓
Run seeders
    ↓
Usable development database
```

Seeders should provide useful development/demo data without coupling the application to production data.

## Core entities

The backend should be designed around entities such as:

```text
User
Role / user role
Address
Category
Brand
Product
ProductImage
Cart
CartItem
Order
OrderItem
```

The exact model implementation should be determined from the requirements and normalized appropriately.

### Model design must consider

- primary keys
- foreign keys
- unique constraints
- indexes
- nullable fields
- defaults
- timestamps
- enum/state fields
- deletion behavior
- associations
- cascading behavior
- inventory fields
- money representation
- transaction boundaries
- uniqueness and data integrity

### Money

Do not rely on JavaScript floating-point arithmetic for authoritative monetary calculations.

Use a consistent database-safe representation such as:

- PostgreSQL `NUMERIC/DECIMAL`, or
- integer minor units

Choose one approach and use it consistently.

### Orders

`OrderItem` must preserve the purchase-time unit price.

Do not calculate historical order totals from the current `Product` price.

---

# 7. Authentication

Authentication should use JWT.

The selected architecture stores JWTs in properly configured cookies.

Cookies should be configured appropriately, including:

- `HttpOnly`
- `Secure` in production
- appropriate `SameSite`
- appropriate expiration
- appropriate cookie scope

Do not use localStorage as the primary JWT storage mechanism for this architecture.

Passwords must:

- never be stored in plaintext
- be hashed with a modern, maintained password-hashing solution
- never be returned by API responses

Authentication and authorization are separate concerns.

### Authentication examples

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

Handle:

- duplicate email
- invalid registration data
- wrong password
- invalid/expired JWT
- missing authentication
- logout
- authenticated user lookup

### Authorization

Roles/permissions must be checked server-side.

Never trust a role sent by the client.

Admin functionality must be protected by authorization middleware.

---

# 8. Cookie Authentication and CSRF

Because authentication uses cookies, explicitly evaluate CSRF protection.

Use an appropriate combination of:

- SameSite cookie policy
- origin checks where appropriate
- CSRF protection/token strategy if required by the final architecture

Do not assume HttpOnly alone solves CSRF.

Document the chosen approach.

---

# 9. Security Requirements

The backend should be designed defensively.

Implement appropriate protections against:

- SQL injection
- XSS-related unsafe output/data handling
- CSRF
- brute-force authentication attacks
- credential stuffing
- mass assignment
- parameter pollution
- oversized requests
- malformed input
- sensitive data exposure
- privilege escalation
- insecure direct object access
- error leakage

Use appropriate security middleware such as Helmet.

Configure CORS explicitly.

For credentialed requests:

- never use a wildcard origin
- use an explicit configured frontend origin

The frontend origin belongs in environment configuration rather than hardcoded application logic.

Use rate limiting where appropriate, especially around authentication and other abuse-prone endpoints.

Do not expose:

- passwords
- password hashes
- JWT secrets
- database credentials
- stack traces in production responses
- internal infrastructure details
- sensitive logs

Never commit secrets.

---

# 10. Environment Configuration

Centralize configuration.

Do not scatter raw `process.env.X` access throughout the application.

Validate environment variables at startup.

The application should fail fast when required configuration is missing or invalid.

Expected configuration may include:

```text
NODE_ENV
PORT
DATABASE_URL / database connection values
JWT_SECRET
JWT_EXPIRES_IN
FRONTEND_ORIGIN
```

Keep:

```text
.env
```

out of version control.

Commit:

```text
.env.example
```

with safe placeholders only.

---

# 11. API Versioning

Use:

```text
/api/v1
```

Example:

```text
GET /api/v1/health
```

Keep API response structures consistent.

Use correct HTTP status codes.

Centralize error formatting.

A typical error shape may be:

```json
{
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Do not leak implementation details through error responses.

---

# 12. Health Endpoint

Implement:

```text
GET /api/v1/health
```

It should verify application health and preferably database connectivity.

A healthy response may resemble:

```json
{
  "status": "ok",
  "service": "core-shop-api",
  "database": "connected"
}
```

Do not expose secrets or internal connection information.

---

# 13. Catalog API

The backend must support the future client in implementing a normal computer-parts e-commerce catalog.

The future client is expected to need concepts such as:

- product browsing
- product search
- filtering
- sorting
- pagination
- product details
- categories
- brands
- product images
- stock availability

Possible API contracts:

```text
GET /api/v1/products
GET /api/v1/products/:slug

GET /api/v1/categories
GET /api/v1/brands
```

The exact query parameters and response contracts should be designed consistently and documented through the API implementation.

Catalog browsing should not require authentication unless a specific operation genuinely requires it.

Use database indexes that support actual query patterns.

Avoid loading unnecessary data.

---

# 14. Future Frontend Flow — BACKEND DESIGN CONTEXT ONLY

The following describes the intended future user journey only so the backend can support it correctly.

**Do not implement any frontend from this section.**

This section is intentionally retained because backend API contracts, authentication behavior, cart behavior, checkout, orders, and data modeling should be designed with the eventual end-to-end application flow in mind.

The future client may allow a visitor to:

```text
Browse catalog
    ↓
Search / filter / sort
    ↓
Open product
    ↓
Add product to cart
    ↓
Continue shopping
    ↓
Review cart
    ↓
Login/register if necessary
    ↓
Checkout
    ↓
Create order
    ↓
View order
```

The backend must therefore expose clean contracts that make this flow possible.

Do not create frontend pages or components for these steps.

---

# 15. Cart

The backend should support normal e-commerce cart behavior.

Expected operations:

```text
GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/:id
DELETE /api/v1/cart/items/:id
```

The exact implementation may use a cart associated with:

- a guest/session identity, and/or
- an authenticated user

### Guest cart

Guest shopping should be supported.

After login, the guest cart should be mergeable into the authenticated user's cart.

### Cart merge

Cart merging must be deterministic.

Handle:

- duplicate products
- quantity combination
- unavailable products
- stock limits
- deleted products
- invalid quantities

Do not allow merged quantities to exceed available stock.

Never trust client-provided product prices.

The server retrieves authoritative product pricing.

---

# 16. Checkout and Orders

Checkout requires authentication.

Possible endpoints:

```text
POST /api/v1/checkout
POST /api/v1/orders

GET  /api/v1/orders
GET  /api/v1/orders/:id
```

The exact separation between checkout and order creation should be chosen based on the final implementation, but the workflow must remain secure and transactionally correct.

### Critical rules

The server must recalculate:

- product prices
- quantities
- subtotal
- discounts if introduced
- shipping if introduced
- final total

Never trust totals supplied by the client.

### Inventory

Checkout/order creation must safely handle stock.

Avoid overselling through appropriate:

- transactions
- row locking where appropriate
- atomic stock updates
- validation inside the transaction

### Order transaction

Order creation should be transactional.

Conceptually:

```text
Begin transaction
    ↓
Validate authenticated user
    ↓
Load cart
    ↓
Load authoritative product data
    ↓
Check/lock inventory as needed
    ↓
Calculate authoritative totals
    ↓
Create order
    ↓
Create order items with purchase-time prices
    ↓
Update inventory
    ↓
Clear/convert cart
    ↓
Commit
```

If any critical step fails, rollback.

Do not create partially completed orders.

---

# 17. Payment

This project does not need real payment processing.

However, the architecture should contain a realistic payment abstraction/state where useful so the system resembles a real e-commerce backend.

Never store:

- raw card numbers
- CVV
- sensitive payment credentials

A fake/mock payment provider can be used for development/testing.

Payment logic should be isolated so a real provider could theoretically be integrated later without rewriting the entire order domain.

---

# 18. Orders

Users should be able to retrieve their own orders.

Users must never be able to retrieve another user's orders simply by changing an ID.

Use authorization checks at the service/domain level where appropriate.

Possible order states may include:

```text
pending
paid
processing
shipped
delivered
cancelled
```

The final state machine should be designed carefully.

Do not allow arbitrary client-supplied status transitions.

Historical order information must remain stable even when product data changes later.

---

# 19. Addresses

The backend should support user addresses as part of the eventual checkout flow.

An address model should distinguish:

- owner/user
- address fields
- optional label/type
- default address behavior where useful
- timestamps

Do not allow a user to modify or use another user's address.

Avoid storing more personal information than the project actually needs.

---

# 20. Admin

The backend should be designed to support administrative operations.

Potential admin responsibilities:

- product management
- category management
- brand management
- product image management
- inventory management
- order management
- user management
- role/authorization management where required

Admin routes must be protected by server-side authorization.

Do not trust:

```text
role=admin
```

from request bodies, query parameters, cookies, or arbitrary headers.

The authenticated identity and its server-side role/permissions are authoritative.

---

# 21. Testing

Automated tests are the primary verification mechanism.

Do not rely on manually testing everything through Postman.

Use a dedicated test strategy, preferably an isolated test database/container.

Tests should cover at least:

### Foundation

- health endpoint
- API startup
- database connectivity
- environment validation
- error handling

### Authentication

- successful registration
- duplicate email
- invalid registration data
- successful login
- incorrect password
- logout
- missing JWT
- invalid JWT
- expired JWT where testable
- authorization
- admin authorization

### Products

- product listing
- pagination
- search
- filtering
- sorting
- product lookup by slug
- nonexistent product
- protected admin CRUD

### Cart

- guest cart
- add item
- update quantity
- remove item
- invalid quantity
- unavailable product
- stock limits
- cart merge after authentication
- duplicate product merge behavior

### Orders

- unauthenticated checkout rejection
- authenticated checkout
- authoritative price calculation
- stock validation
- stock reduction
- successful order creation
- order item price snapshots
- transaction rollback on failure
- users cannot access another user's orders

Tests should verify behavior, not implementation details unnecessarily.

---

# 22. Error Handling

Implement centralized error handling.

Differentiate appropriately between:

- validation errors
- authentication errors
- authorization errors
- not found
- conflict
- business-rule violations
- database errors
- unexpected internal errors

Production responses must not expose stack traces or sensitive internal details.

Log useful diagnostic information server-side without logging:

- passwords
- JWT secrets
- payment secrets
- sensitive personal data unnecessarily

---

# 23. Database Integrity

Use the database to enforce invariants wherever practical.

Examples:

- unique email
- unique slug where required
- valid foreign keys
- valid required fields
- sensible defaults
- unique product/category/brand identifiers
- appropriate indexes

Do not rely entirely on application code for constraints that the database can enforce reliably.

---

# 24. Transactions

Use Sequelize transactions for workflows that modify multiple related records and must remain atomic.

Important transaction candidates include:

- checkout
- order creation
- inventory updates
- cart merge when multiple records are modified
- other multi-step state transitions

Do not wrap every simple read in a transaction without a reason.

---

# 25. Performance and Query Discipline

Avoid:

- N+1 query patterns
- loading entire tables unnecessarily
- unbounded list endpoints
- returning huge object graphs
- selecting sensitive columns unnecessarily

Use:

- pagination
- appropriate indexes
- selective attributes
- controlled eager loading
- database-side filtering/sorting
- reasonable request limits

Do not prematurely introduce Redis, queues, microservices, Elasticsearch, or other infrastructure unless an actual requirement justifies it.

---

# 26. SEO-Relevant Backend Considerations

SEO is primarily a future frontend concern, but the backend should provide data that allows a future client to implement SEO correctly.

Therefore product/category APIs should expose stable, meaningful identifiers such as:

- slugs
- product names
- descriptions
- category relationships
- brand relationships
- image metadata where appropriate

Do not implement frontend SEO, metadata components, SSR, sitemap generation, or frontend routing in this backend-only phase unless explicitly requested later.

---

# 27. Docker

Use Docker Compose for PostgreSQL and backend infrastructure as appropriate.

PostgreSQL should use:

- PostgreSQL 18.x
- an explicit secure patch version at implementation time
- persistent storage
- environment-based credentials
- a health check
- no unnecessary public exposure of the database

Do not use:

```text
postgres:latest
```

Pin the database image to a known secure release and update it deliberately.

The application should be able to start against the Dockerized database through environment configuration.

---

# 28. Code Quality Rules

Prefer:

- strict TypeScript
- explicit types
- small focused functions
- clear naming
- predictable module boundaries
- reusable validation
- centralized configuration
- centralized error handling
- consistent API responses

Avoid:

- `any`
- giant files
- giant controllers
- duplicated business rules
- hidden global state
- unnecessary abstractions
- premature microservices
- magical generic frameworks
- hardcoded secrets
- direct database access scattered across controllers
- blindly trusting client data

---

# 29. Development Workflow

Work incrementally.

For each meaningful step:

1. Inspect current state.
2. Make the smallest coherent change.
3. Run formatting/linting if configured.
4. Run TypeScript type checking.
5. Run automated tests.
6. Fix failures before moving on.
7. Verify database/migration behavior where relevant.
8. Summarize what changed.

Do not implement five unrelated modules and only test at the end.

---

# 30. Required First Phase

Do **NOT** immediately implement the complete e-commerce system.

The first task is only the backend foundation.

### First task checklist

1. Inspect the existing repository.
2. Confirm the `server/` state.
3. Preserve useful existing work.
4. Initialize/configure the backend if necessary.
5. Configure strict TypeScript.
6. Configure Express 5.
7. Configure environment validation.
8. Configure Docker Compose PostgreSQL 18.x.
9. Configure Sequelize 6.x.
10. Establish the database connection.
11. Establish the backend project structure.
12. Implement centralized error handling.
13. Implement baseline security middleware.
14. Implement explicit CORS configuration.
15. Implement `GET /api/v1/health`.
16. Add automated tests for the foundation.
17. Verify TypeScript, tests, database connectivity, and application startup.
18. Report the resulting state.

### Do not proceed to

- products
- authentication
- cart
- checkout
- orders
- admin

until the foundation is working and verified.

---

# 31. Frontend Boundary — Repeat for Clarity

The future frontend may eventually consume APIs for:

```text
Catalog
Product details
Authentication
Cart
Checkout
Orders
Account/profile
Admin operations
```

This information is included **only to ensure backend APIs and database design support the full eventual application flow**.

It is NOT a request to build the frontend now.

### Absolutely do not

- modify `client/`
- create frontend files
- choose a frontend framework
- create frontend routes
- create UI components
- create frontend state management
- create frontend styles
- create frontend API clients
- implement frontend authentication state
- implement frontend SEO
- infer missing frontend requirements

The backend should expose clean contracts that a future frontend can consume.

---

# 32. Decision-Making Rules

When requirements conflict:

1. Security
2. Data integrity
3. Correctness
4. Maintainability
5. Simplicity
6. Performance
7. Convenience

Do not blindly follow an existing implementation if it creates a clear security, correctness, or architectural problem.

If an existing choice is questionable:

- identify the problem
- explain the trade-off
- propose the safer/simpler alternative
- implement the alternative when appropriate

Do not over-engineer merely to make the project look sophisticated.

---

# 33. Completion Standard

A backend task is not considered complete merely because files were created.

Before reporting completion, verify the relevant behavior with:

- type checking
- automated tests
- linting/formatting where configured
- database migration checks where relevant
- startup verification
- API behavior verification

When something cannot be verified, explicitly state what was not verified and why.

---

# 34. OpenCode Operating Instruction

You are working as a senior backend engineer on Core Shop.

Read this entire specification before making changes.

**Backend implementation only.**

Inspect first. Preserve good existing work. Do not touch the frontend implementation.

Build a secure, maintainable, tested modular monolith.

Do not jump ahead of the current phase.

Start with the backend foundation described in Section 30, verify it thoroughly, and only then wait for the next development instruction.

# 32. Companion Agent Files

This specification works together with:

- `AGENTS.md` — agent operating instructions and repository workflow.
- `RULES.md` — non-negotiable engineering and security rules.

The backend specification defines **what Core Shop needs**. The companion files define **how the AI agent should work while implementing it**.
