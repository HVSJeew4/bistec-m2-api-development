# Month 2 Plan – API Development

> Status: **Approved** (2026-11-01). All proposals and the recommended answers to Q1–Q7 accepted.
> Ready for Part 1.

## 1. Summary

We are building **BlogFlow API**, a REST backend for a blog platform with three resources: Users,
Posts and Comments. Users register with email and password and log in to receive a JWT (24h). With
that token they manage their profile, write posts and comment on posts. Only the owner of a post or
comment may change or delete it. Every endpoint validates its input and returns one consistent JSON
envelope for success, error and paginated lists. The API is rate limited to 100 requests per minute,
documented with an OpenAPI 3 (Swagger) spec and a Postman collection, and backed by a PostgreSQL
schema with indexes and seed data (5 users, 20 posts, 50 comments).

## 2. Tech stack

**Fixed by the brief / rubric:**
- Express.js, PostgreSQL, JWT (`jsonwebtoken`, `expiresIn: '24h'`, secret from `process.env.JWT_SECRET`)
- `bcrypt` with 10 salt rounds
- `express-rate-limit` (100 requests / minute)
- OpenAPI 3.0.0 spec (`swagger.yaml`) and a Postman collection
- Plain JavaScript with `src/app.js` as entry (rubric project structure)

**Already installed locally:** Node 22.20, npm 10.9, PostgreSQL 18.4 (no Docker).

**Open choices (proposed):**

| Choice | Proposal | Reason | Status |
|---|---|---|---|
| Express version | Express 5 | Stable since 2024; forwards rejected promises from async handlers to the error middleware, so no `try/catch` wrapper in every controller | Approved |
| Module system | CommonJS (`require`) | Default for Express examples and Jest works without extra config | Approved |
| DB access | `pg` (node-postgres) with parameterised SQL inside `src/models/` | No ORM hides the schema, so the Database Design work stays visible; parameters prevent SQL injection | Approved |
| Migrations / seeds | Numbered `.sql` files in `database/migrations/`, a JS seed in `database/seeds/`, run by two small npm scripts | Matches the rubric folders without adding a migration framework | Approved |
| Validation + sanitisation | `express-validator` | Validates *and* sanitises (`trim`, `escape`, `normalizeEmail`) – covers "Input sanitization" in the checklist | Approved |
| Extra security headers | `helmet` + `cors` | Standard Express hardening, one line each | Approved |
| Swagger UI | `swagger-ui-express` + `yaml` serving `docs/swagger.yaml` at `/api-docs` | The spec file is the deliverable; the UI just renders the same file, so there is one source | Approved |
| Tests | Jest + `supertest` against a separate `blogflow_test` database | Rubric has a `tests/` folder; tests hit real SQL, so they also prove the schema | Approved |
| Lint / format | ESLint 9 (flat config) + Prettier | Code Quality criterion; same tooling family as Month 1 | Approved |
| Config | `dotenv`; `.env.example` with placeholders for `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`, `PORT`, `SEED_USER_PASSWORD` | Security rule: no secrets in tracked files | Required |

## 3. Submission checklist

Naming convention: `[participant-name]-month2-[deliverable]` (e.g. `john-doe-month2-api-project.zip`).
Participant name (same as Month 1): `subhash-jeewantha`.

Required files (placed in `submission/`):
- [ ] `subhash-jeewantha-month2-api-project.zip` – complete Node.js project (no `node_modules`, no `.env`)
- [ ] `subhash-jeewantha-month2-schema.sql` – database schema
- [ ] `subhash-jeewantha-month2-postman.json` – Postman collection
- [ ] `subhash-jeewantha-month2-swagger.yaml` – OpenAPI spec
- [ ] `subhash-jeewantha-month2-readme.md` – setup instructions

Folder structure (rubric "Project Structure"):
```
blog-api/                      # = repo root; the zip wraps it in a blog-api/ folder (Q1)
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   └── app.js
├── database/
│   ├── migrations/
│   └── seeds/
├── tests/
├── .env.example
├── package.json
└── README.md
```
Additional files we add: `src/server.js` (starts the listener, so tests can import `app.js`
without opening a port), `src/config/` (env loading), `docs/swagger.yaml`, `postman/`, `scripts/`,
`submission/`.

Code requirements:
- [x] Database: `users`, `posts`, `comments` tables with relationships (FKs), indexes for common
      queries, seed data of exactly 5 users, 20 posts, 50 comments
- [ ] Users: register (email/password), login returns JWT, view + update profile
- [ ] Posts: create, read, update, delete; list with pagination and filtering; author association
- [ ] Comments: create on post, list by post, delete own
- [ ] **15+ endpoints** working – 12 from the brief + 4 extras = 16 (Q2)
- [ ] Success envelope `{ "success": true, "data": … }`
- [ ] Error envelope `{ "success": false, "error": { "code", "message", "details" } }`
- [ ] Pagination envelope `{ "success": true, "data": [...], "pagination": { page, limit, total, totalPages } }`
- [ ] Input validation on all endpoints
- [ ] Rate limiting 100 requests/minute
- [ ] JWT auth for protected routes; owner-only checks on post/comment update and delete
- [ ] Security checklist: bcrypt (10 rounds), JWT validation, protected route middleware,
      owner-only check, rate limiting (express-rate-limit), input sanitisation
- [ ] Swagger: `openapi: 3.0.0`, `info.title: BlogFlow API`, `version: 1.0.0`, every endpoint
- [ ] Postman: all endpoints grouped by resource, variables for base URL and token, test scripts
      validating responses, pre-request script for the auth token

## 4. Part-by-part plan

Tests are written alongside each part (supertest), so every commit runs `npm test` + `npm run lint`.
Brief time budgets are for the in-session work; offline polish is extra.

### Part 1 – Database Setup (brief: 20 min)

- [x] `npm init`, install dependencies, ESLint + Prettier, Jest config, npm scripts
      (`test`, `lint`, `format`, `db:migrate`, `db:seed`, `db:reset`; `dev`/`start` moved to Part 2 with `src/server.js`) — *Code Quality*
- [x] `.env.example` placeholders; `src/config/index.js` reads and checks env vars — *Code Quality, Authentication*
- [x] `database/migrations/001_create_users.sql`, `002_create_posts.sql`, `003_create_comments.sql`
      using the brief schema plus the hardening in Q4 — *Database Design*
- [x] `database/migrations/004_create_indexes.sql`: `posts(author_id)`, `posts(published, created_at DESC)`,
      `comments(post_id, created_at)`, `comments(author_id)` (email is already indexed by `UNIQUE`) — *Database Design*
- [x] `scripts/migrate.js` – runs migration files in order, records applied ones in a
      `schema_migrations` table — *Database Design*
- [x] `database/seeds/seed.js` – 5 users (bcrypt hashes of `SEED_USER_PASSWORD`), 20 posts
      (mix of published/draft), 50 comments, deterministic — *Database Design*
- [x] `src/db/pool.js` – one shared `pg.Pool` — *Code Quality*
- [x] Test: `tests/db/schema.test.js` – tables, FKs, cascade and indexes exist; seed counts are 5/20/50 — *Database Design*
- [x] README: prerequisites, create DBs, `.env`, migrate, seed
- Commit: `feat: add database schema, indexes and seed data`

### Part 2 – CRUD Endpoints (brief: 50 min)

- [ ] `src/utils/response.js` – `success()`, `paginated()` helpers; `src/utils/AppError.js` +
      `src/middleware/errorHandler.js` + 404 handler producing the error envelope — *Error Handling*
- [ ] Error codes: `VALIDATION_ERROR` 400, `UNAUTHORIZED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404,
      `CONFLICT` 409 (duplicate email), `RATE_LIMITED` 429, `INTERNAL_ERROR` 500 — *Error Handling*
- [ ] `src/middleware/validate.js` + validators per route (`express-validator`) — *Error Handling, Endpoint Completeness*
- [ ] `src/utils/pagination.js` – parse `page`/`limit` (defaults 1/10, max 100) — *Endpoint Completeness*
- [ ] Models: `src/models/userModel.js`, `postModel.js`, `commentModel.js` (parameterised SQL, never
      return `password_hash`) — *Database Design, Code Quality*
- [ ] Controllers + routes for auth, users, posts, comments (`src/controllers/*`, `src/routes/*`,
      mounted under `/api` in `src/app.js`) — *Endpoint Completeness*
- [ ] Endpoints from the brief:
  - [ ] `POST /api/auth/register`, `POST /api/auth/login`
  - [ ] `GET /api/users/me`, `PUT /api/users/me`
  - [ ] `GET /api/posts` (pagination + filters, see Q3), `GET /api/posts/:id`, `POST /api/posts`,
        `PUT /api/posts/:id`, `DELETE /api/posts/:id`
  - [ ] `GET /api/posts/:id/comments`, `POST /api/posts/:id/comments`, `DELETE /api/comments/:id`
- [ ] Extra endpoints to reach 15+ (Q2, approved): `GET /api/health`, `GET /api/users/:id`, `GET /api/users/:id/posts`, `PUT /api/comments/:id`
- [ ] Minimal auth so the endpoint table works (Q5 Option A): `src/utils/password.js`
      (`bcrypt.hash(password, 10)` / `compare`), `src/utils/jwt.js`
      (`jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '24h' })`), `src/middleware/auth.js`
      (Bearer token → `req.user`), owner check on post/comment update and delete (403) — *Authentication*
- [ ] Posts and comments responses include the author (`id`, `name`) via JOIN — *Endpoint Completeness*
- [ ] Tests: `tests/auth.test.js`, `tests/users.test.js`, `tests/posts.test.js`, `tests/comments.test.js`
      – happy path, validation error, 404 for each endpoint — *Endpoint Completeness, Error Handling*
- Commits: `feat: add response helpers and error handling`, `feat: add user, post and comment endpoints`

(The order question between Part 2 and Part 3 is Q5.)

### Part 3 – Authentication & Security (brief: 30 min)

Works through the brief's Security Checklist and hardens what Part 2 started.
- [ ] Checklist: bcrypt 10 rounds confirmed by test (hash prefix `$2b$10$`) — *Authentication*
- [ ] `src/middleware/auth.js` hardened: 401 `UNAUTHORIZED` for missing header, wrong scheme,
      malformed, bad signature, expired token, and token of a deleted user — *Authentication, Error Handling*
- [ ] Owner-only check covered for every owner route (post PUT/DELETE, comment DELETE/PUT) — *Authentication*
- [ ] Startup fails fast if `JWT_SECRET` is missing or shorter than 32 characters — *Authentication*
- [ ] `src/middleware/rateLimiter.js` – `express-rate-limit`, 100 req / 60 s, JSON error envelope
      with `RATE_LIMITED`, standard `RateLimit-*` headers — *Authentication, Error Handling*
- [ ] `helmet()`, `cors()`, `express.json({ limit: '100kb' })` in `app.js` — *Code Quality*
- [ ] Sanitisation: `trim`/`escape` on text fields, `normalizeEmail`, strip unknown body fields — *Code Quality*
- [ ] Login returns the same `UNAUTHORIZED` message for unknown email and wrong password — *Authentication*
- [ ] Tests: `tests/security.test.js` – no token, bad token, expired token, non-owner update/delete
      → 403, password stored as bcrypt hash, 101st request → 429 — *Authentication*
- Commit: `feat: harden auth, add rate limiting and input sanitisation`

### Part 4 – Documentation & Testing (brief: 20 min)

- [ ] `docs/swagger.yaml` – OpenAPI 3.0.0, all endpoints, `bearerAuth` security scheme, reusable
      schemas (`User`, `Post`, `Comment`, `Pagination`, `Error`), request bodies, all response codes — *Documentation*
- [ ] Serve it at `GET /api-docs` with `swagger-ui-express` — *Documentation*
- [ ] Test: `tests/docs.test.js` – the spec parses, and every Express route has a path in the spec — *Documentation*
- [ ] `postman/BlogFlow.postman_collection.json` – folders Auth / Users / Posts / Comments; variables
      `baseUrl` and `token`; Login test script saves `token`; collection pre-request script adds
      `Authorization: Bearer {{token}}`; per-request tests check status code and `success` field — *Documentation*
- [ ] `postman/BlogFlow.postman_environment.json` – `baseUrl`, `token` (empty) — *Documentation*
- [ ] Run the collection with Newman (`npx newman run …`) against the seeded DB, all tests green — *Documentation, Endpoint Completeness*
- [ ] README complete: setup, run, test, API overview, design decisions, known limitations
- [ ] `scripts/package-submission.js` builds the 5 files in `submission/` — *Submission*
- Commits: `docs: add OpenAPI spec and Postman collection`, `chore: add submission files`

## 5. Rubric map

| Rubric criterion (points) | Evidence in the repo | Task(s) |
|---|---|---|
| Endpoint Completeness (25) – all 15+ endpoints working | `src/routes/`, `src/controllers/`, `tests/{auth,users,posts,comments}.test.js`, Newman run | Part 2 endpoints, Q2 extras, Part 4 Newman |
| Database Design (20) – schema, relationships, indexes | `database/migrations/*.sql`, `database/seeds/seed.js`, `tests/db/schema.test.js`, `submission/*-schema.sql` | Part 1 |
| Authentication (20) – JWT working, protected routes | `src/middleware/auth.js`, `src/utils/jwt.js`, `src/utils/password.js`, `src/middleware/rateLimiter.js`, `tests/security.test.js` | Part 3 |
| Documentation (15) – Swagger complete, Postman usable | `docs/swagger.yaml`, `/api-docs`, `postman/*.json`, `tests/docs.test.js`, README | Part 4 |
| Error Handling (10) – consistent format, appropriate codes | `src/utils/AppError.js`, `src/middleware/errorHandler.js`, `src/middleware/validate.js`, error-case tests | Part 2, Part 3 |
| Code Quality (10) – clean structure, best practices | Rubric folder structure, `eslint.config.js`, Prettier, layered routes → controllers → models, env config, no secrets | All parts |

## 6. Risks and questions

**Decisions (2026-11-01):** all answered "as proposed" – Q1 repo root is the project; Q2 the 4 extra
endpoints listed; Q3 filters `author_id` / `search` / `sort`, drafts visible only to their author;
Q4 schema hardening accepted; Q5 Option A; Q6 Jest + supertest tests added; Q7 collection variables
plus an environment file. The original questions are kept below for reference.

**Q1 – Repo root vs `blog-api/` folder.** The rubric tree starts at `blog-api/`. I propose the repo
root *is* the project (like Month 1), and the zip contains a top-level `blog-api/` folder. OK?

**Q2 – "15+ endpoints" but the brief tables list only 12.** Proposal for 4 extra endpoints (total 16),
all small and in scope:
1. `GET /api/health` – liveness + DB check (no auth)
2. `GET /api/users/:id` – public profile of an author (no auth, no email)
3. `GET /api/users/:id/posts` – published posts by one author, paginated (no auth)
4. `PUT /api/comments/:id` – edit own comment (owner)

Alternatives: `GET /api/comments/:id`, `GET /api/users/me/posts` (own posts incl. drafts),
`PATCH /api/posts/:id/publish`. Which set do you want?

**Q3 – Filtering and draft visibility on `GET /api/posts`.** Proposal: filters `author_id`, `search`
(case-insensitive match on title), `sort` (`created_at` asc/desc). Anonymous callers only see
`published = true` posts; a logged-in author also sees their own drafts with `?published=false`.
`GET /api/posts/:id` returns 404 for someone else's draft. OK?

**Q4 – Small changes to the brief's schema.** As written, deleting a post that has comments fails
(FK without `ON DELETE`), and `author_id`/`post_id` can be NULL. Proposal:
- `NOT NULL` on `posts.author_id`, `comments.post_id`, `comments.author_id`
- `ON DELETE CASCADE` on those FKs (delete post → its comments go)
- `updated_at` kept current by a trigger (or set in the UPDATE query)
- `TIMESTAMPTZ` instead of `TIMESTAMP`

Columns and names stay exactly as in the brief. Is that deviation acceptable, or should the schema
match the brief word for word?

**Q5 – Part 2 / Part 3 overlap.** Part 2's endpoint table already needs register/login and "Auth:
Yes / owner", and creating a post needs the logged-in user as `author_id`. Option A (recommended):
Part 2 adds the minimum to make those endpoints real – bcrypt hash on register, `jwt.sign` on
login, the `auth` middleware and the owner check. Part 3 then works through the brief's Security
Checklist: token edge cases (expired / malformed / deleted user), rate limiting, helmet,
sanitisation and `tests/security.test.js`. Option B: leave protected routes open in Part 2 and add
all auth in Part 3. B matches the brief's headings more closely, but the Part 2 commit would ship
unprotected write endpoints. The part sections above follow Option A. Which one?

**Q6 – Tests.** The brief's Part 4 "Testing" means Postman test scripts; the rubric only shows a
`tests/` folder. I plan Jest + supertest tests on top (needs a `blogflow_test` database). Fine, or
should I keep testing to Postman/Newman only?

**Q7 – Postman environment.** Only one Postman file is a deliverable. I'll put `baseUrl`/`token` as
collection variables (so the single file works alone) and also commit an environment file in
`postman/`. OK?

**Risks**
- Rate limiter would break the test suite → limit read from config, with a dedicated test that
  lowers the window to prove the 429.
- `bcrypt` is a native module → it ships prebuilt Windows binaries for Node 22; fallback is
  `bcryptjs` (same API) if install fails. I'll tell you before switching.
- Local PostgreSQL 18 needs a DB user and two databases (`blogflow`, `blogflow_test`); the README will
  list the `createdb` commands. Credentials go in `.env` only.
- Swagger drift → `tests/docs.test.js` fails if a route is missing from the spec.
