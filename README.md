# Month 2 – API Development: BlogFlow API

## Overview

BlogFlow API is a RESTful backend for a blog platform (Users, Posts, Comments), built for the
BISTEC Academy Engineer Track Month 2 challenge. See `docs/CHALLENGE.md` for the brief and
`docs/PLAN.md` for the plan and progress.

## Tech Stack

- Node.js 24.9+ (developed on 26), Express 5, CommonJS modules
- Security: `helmet`, `cors`, `express-rate-limit`, `sanitize-html` (+ `entities`)
- PostgreSQL (tested on 18) via `pg` (node-postgres) with plain parameterised SQL
- `bcrypt` (10 rounds) for passwords, `jsonwebtoken` (HS256, 24h) for auth
- `express-validator` for input validation
- Jest + supertest for tests, ESLint 10 (flat config) + Prettier for lint/format

## Getting Started

### Prerequisites

- Node.js **24.9 or newer** and npm (see "Why Node 24.9+" under Design Decisions)
- A running PostgreSQL server and a database user allowed to create databases

### 1. Install

```bash
npm install
```

### 2. Create the two databases

```bash
createdb -U <db-user> blogflow
createdb -U <db-user> blogflow_test
```

`blogflow_test` is wiped and re-seeded on every test run, so keep it separate from `blogflow`.

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your own values. `.env` is gitignored – never commit it.

| Variable             | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| `DATABASE_URL`       | Main database connection string                         |
| `TEST_DATABASE_URL`  | Test database (must differ from `DATABASE_URL`)         |
| `SEED_USER_PASSWORD` | Password given to all 5 seeded demo users               |
| `PORT`               | HTTP port (default 3000)                                |
| `JWT_SECRET`         | Secret for signing tokens – long and random             |

Generate a secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

### 4. Create the schema and load seed data

```bash
npm run db:migrate   # applies new files from database/migrations/
npm run db:seed      # replaces all data with 5 users, 20 posts, 50 comments
# or both in one go, dropping existing tables first:
npm run db:reset
```

Seeded users: `amara@`, `kasun@`, `nethmi@`, `ravi@`, `dilini@blogflow.test`, all with
`SEED_USER_PASSWORD`. Each user has 4 posts, one of them a draft; the 50 comments are spread over
the 15 published posts.

### 5. Run the API

```bash
npm run dev     # restarts on file changes (node --watch)
npm start       # plain start
```

The API listens on `http://localhost:3000/api`. Quick check: `curl http://localhost:3000/api/health`.

## API Overview

All responses use one envelope: `{ "success": true, "data": … }`, lists add
`"pagination": { page, limit, total, totalPages }`, and errors are
`{ "success": false, "error": { "code", "message", "details"? } }`.
Protected routes need `Authorization: Bearer <token>` from `POST /api/auth/login`.

| Method | Endpoint                  | Auth     | Notes                                                    |
| ------ | ------------------------- | -------- | -------------------------------------------------------- |
| GET    | `/api`                    | –        | API name, version and links to the main resources        |
| GET    | `/api/health`             | –        | API + database status                                    |
| POST   | `/api/auth/register`      | –        | `email`, `password` (8–72), `name`, optional `bio`       |
| POST   | `/api/auth/login`         | –        | Returns `{ token, user }`; token valid 24h               |
| GET    | `/api/users/me`           | Yes      | Own profile, including email                             |
| PUT    | `/api/users/me`           | Yes      | Update `name` and/or `bio` (`null` clears bio)           |
| GET    | `/api/users/:id`          | –        | Public profile (no email)                                |
| GET    | `/api/users/:id/posts`    | –        | That author's published posts, paginated                 |
| GET    | `/api/posts`              | Optional | Published posts; see query parameters below              |
| GET    | `/api/posts/:id`          | Optional | Published post, or your own draft                        |
| POST   | `/api/posts`              | Yes      | `title`, `content`, optional `published` (default false) |
| PUT    | `/api/posts/:id`          | Owner    | Any of `title`, `content`, `published`                   |
| DELETE | `/api/posts/:id`          | Owner    | Also deletes the post's comments                         |
| GET    | `/api/posts/:id/comments` | Optional | Oldest first, paginated                                  |
| POST   | `/api/posts/:id/comments` | Yes      | `content`                                                |
| PUT    | `/api/comments/:id`       | Owner    | `content`                                                |
| DELETE | `/api/comments/:id`       | Owner    | Only your own comments                                   |

`GET /api/posts` query parameters: `page` (default 1), `limit` (default 10, max 100),
`author_id`, `search` (case-insensitive title match), `sort` (`desc` default, or `asc` by
creation date), `published=false` (logged in only: lists your own drafts).

Error codes: `VALIDATION_ERROR` 400, `UNAUTHORIZED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404,
`CONFLICT` 409, `PAYLOAD_TOO_LARGE` 413, `RATE_LIMITED` 429, `INTERNAL_ERROR` 500,
`SERVICE_UNAVAILABLE` 503.

### Security

| Brief checklist item          | Implementation                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Password hashing (bcrypt, 10) | `src/utils/password.js`; hashes start with `$2b$10$`                           |
| JWT token validation          | `src/utils/jwt.js` – HS256 pinned, 24h expiry, secret ≥ 32 chars or no startup |
| Protected route middleware    | `src/middleware/auth.js` – `requireAuth` / `optionalAuth`                      |
| Owner-only operations         | `findOwnPost` / `findOwnComment` in the controllers → 403                      |
| Rate limiting                 | `src/middleware/rateLimiter.js` – 100 requests/min per IP → 429                |
| Input sanitisation            | `src/utils/sanitize.js` (HTML stripped), validators, repeated query params     |

Also: `helmet` security headers, CORS, 100kb body limit. Every item is tested in
`tests/security.test.js`, `tests/rateLimit.test.js` and `tests/unit/`.

## Running Tests

```bash
npm test       # Jest + supertest; rebuilds blogflow_test, each file re-seeds before it runs
npm run lint   # ESLint + Prettier check
npm run format # apply Prettier formatting
```

There is no build step (plain JavaScript, no transpiling). `npm test` runs Jest with Node's
`--experimental-vm-modules` flag – see "Why Node 24.9+" below.

## Project Structure

```
database/
  migrations/   numbered .sql files, applied in order (tracked in schema_migrations)
  seeds/        seed.js – deterministic demo data
scripts/        migrate.js, reset-db.js
src/
  app.js        builds the Express app (no listening – used by tests)
  server.js     starts the HTTP server
  config/       loads .env and checks required variables
  db/pool.js    the shared PostgreSQL connection pool
  routes/       URL → middleware chain → controller
  validators/   express-validator rules per resource
  controllers/  request handling; no SQL
  models/       all SQL, parameterised
  middleware/   auth (JWT), validate, error handler, rate limiter, repeated-query check
  utils/        AppError, response envelopes, pagination, password, jwt, sql, sanitize
tests/
  globalSetup.js  resets the test database before Jest runs
  helpers.js      supertest client, tokens for seed users, error assertions
  db/             schema and seed tests
  unit/           pure functions (HTML stripping, config checks)
  *.test.js       one file per resource, plus security and rate limiting
```

Request flow: `helmet → cors → rate limit → JSON body → repeated-query check → route →
(requireAuth | optionalAuth) → validate(rules) → controller → model → SQL`.
Errors from any step go to `middleware/errorHandler.js`.

## Design Decisions

- **Plain SQL migrations, no ORM.** The schema is the Database Design deliverable, so it stays
  visible as SQL. A 50-line runner (`scripts/migrate.js`) applies each file once, in its own
  transaction, and records it in `schema_migrations`.
- **Schema hardening on top of the brief** (columns and names unchanged):
  - `NOT NULL` on every foreign key – a post without an author or a comment without a post is
    meaningless.
  - `ON DELETE CASCADE` – deleting a post removes its comments; otherwise `DELETE /api/posts/:id`
    would fail for any post with comments.
  - `TIMESTAMPTZ` instead of `TIMESTAMP` – stores an absolute moment, independent of server time zone.
  - A `set_updated_at()` trigger keeps `updated_at` correct on every `UPDATE`.
- **Indexes** (`004_create_indexes.sql`): PostgreSQL does not index foreign keys automatically.
  Indexes match the queries the API will run: posts by author, published posts newest first,
  comments of a post in date order, comments by author. `users.email` is already indexed by its
  `UNIQUE` constraint.
- **Separate test database.** Tests run real SQL against `blogflow_test`; config refuses to start
  in test mode if it points at the main database.
- **Deterministic seed.** Fixed names, titles and dates (no random data), so tests and demos are
  repeatable. Seed passwords come from `.env`, not from the code.
- **Only validated fields reach the database.** `validate()` stores express-validator's
  `matchedData` in `req.valid`; controllers never read `req.body`. Sending `author_id`, `email` or
  `id` in a body therefore has no effect.
- **Drafts are private.** Anyone sees published posts; a draft is visible only to its author.
  Someone else's draft answers 404 (not 403), so the API does not reveal that it exists. For a
  published post owned by someone else, update/delete answers 403.
- **Express 5 async errors.** Express 5 passes rejected promises from `async` handlers to the error
  handler, so controllers just `throw AppError.notFound(...)` – no try/catch in every handler.
- **Unexpected errors** are logged on the server and answered with a generic 500
  `INTERNAL_ERROR`, never with SQL or stack details.
- **`PUT` accepts partial updates** (at least one field). Requiring every field again would make
  clients resend content just to publish a draft.
- **Embedded author.** Posts and comments include `author: { id, name }` via a SQL `JOIN`, so a
  client renders a list in one request. Inserts/updates use a CTE (`WITH … RETURNING`) to return
  the same shape in one query.
- **Login errors are identical** for an unknown email and a wrong password.
- **Passwords are limited to 72 characters**, because bcrypt ignores everything after 72 bytes.
- **Email is trimmed and lower-cased**, not `normalizeEmail`-ed (that would also strip dots from
  Gmail addresses and change what the user typed).
- **`DELETE` returns 200 with `{ id }`**, not 204, so every response keeps the JSON envelope.
- **HTML is stripped, not escaped.** Text fields (title, content, comment, name, bio) go through
  `stripHtml`: tags and the contents of `<script>`/`<style>` are removed, plain text is kept
  exactly as typed. `escape()` was rejected because it changes the data (`Q&A` → `Q&amp;A`),
  breaks search, and shows `&amp;` in any client that escapes on output (which clients should).
  `sanitize-html` parses like a browser; its output is decoded back to plain text with `entities`,
  repeated until stable so entity-encoded tags (`&lt;script&gt;`) are removed too.
- **Repeated query parameters are rejected.** `?page=1&page=2` made Express produce an array,
  which crashed the SQL query with a 500; now any repeated parameter is a 400.
- **Rate limit before everything else** (after security headers), so even rejected or 404
  requests count. `RateLimit` / `RateLimit-Policy` headers (IETF draft 7) show the budget;
  a 429 adds `Retry-After` and uses the normal error envelope.
- **CORS open to all origins.** Auth is a Bearer header, not a cookie, so another website cannot
  act for a user without already holding their token.
- **JWT hardening.** Algorithm pinned to HS256 (an `alg: none` token is refused), secret must be
  ≥ 32 characters or the server will not start, the scheme name is case-insensitive as HTTP
  requires, and a token for a deleted user is refused.
- **Why Node 24.9+.** `sanitize-html`'s parser (`htmlparser2` 12) and `entities` 9 are ES-module
  only. Node 22+ loads them from CommonJS natively, but Jest's own module loader can only do so on
  Node ≥ 24.9 with `--experimental-vm-modules` (it needs `vm.SourceTextModule`). Pinning an
  18-month-old `sanitize-html` or a weaker stripper was rejected for a security library.

## Challenge Coverage

- [x] Part 1 – Database setup (schema, relationships, indexes, seed data)
- [x] Part 2 – CRUD endpoints (16 endpoints, validation, error envelope, pagination, basic JWT auth)
- [x] Part 3 – Authentication & security (full security checklist, rate limiting, HTML stripping)
- [ ] Part 4 – Documentation & testing

## Known Limitations

- `comments` has no `updated_at` column (the brief's schema has none), so an edited comment does
  not record when it was edited.
- Email and password cannot be changed through `PUT /api/users/me` (only `name` and `bio`).
- Rate-limit counters are kept in memory: they reset on restart and are not shared between
  several server processes (a shared store such as Redis would be needed). Behind a reverse proxy,
  Express's `trust proxy` must be set, or all clients share the proxy's IP.
- Login has the same 100/min limit as everything else; a stricter per-account limit against
  password guessing is not implemented.
- Text that looks like an HTML tag is removed even if it was meant as text, e.g. `a<b>c` becomes
  `ac` (`a < b` with spaces is kept).
- JWTs cannot be revoked before they expire (no logout / token blacklist); deleting a user does
  invalidate their tokens, because the auth middleware checks that the user still exists.
