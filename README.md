# Month 2 – API Development: BlogFlow API

## Overview

BlogFlow API is a RESTful backend for a blog platform (Users, Posts, Comments), built for the
BISTEC Academy Engineer Track Month 2 challenge. See `docs/CHALLENGE.md` for the brief and
`docs/PLAN.md` for the plan and progress.

## Tech Stack

- Node.js 22, Express 5 (from Part 2), CommonJS modules
- PostgreSQL (tested on 18) via `pg` (node-postgres) with plain parameterised SQL
- `bcrypt` (10 rounds) for passwords, JWT for auth (from Part 2)
- Jest for tests, ESLint 10 (flat config) + Prettier for lint/format

## Getting Started

### Prerequisites

- Node.js 22+ and npm
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
| `PORT`, `JWT_SECRET` | Used from Part 2 onwards                                |

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

## Running Tests

```bash
npm test       # Jest; rebuilds blogflow_test (migrate + seed) before the run
npm run lint   # ESLint + Prettier check
npm run format # apply Prettier formatting
```

There is no build step (plain JavaScript, no transpiling).

## Project Structure

```
database/
  migrations/   numbered .sql files, applied in order (tracked in schema_migrations)
  seeds/        seed.js – deterministic demo data
scripts/        migrate.js, reset-db.js
src/
  config/       loads .env and checks required variables
  db/pool.js    the shared PostgreSQL connection pool
tests/
  globalSetup.js  resets the test database before Jest runs
  db/             schema and seed tests
```

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

## Challenge Coverage

- [x] Part 1 – Database setup (schema, relationships, indexes, seed data)
- [ ] Part 2 – CRUD endpoints
- [ ] Part 3 – Authentication & security
- [ ] Part 4 – Documentation & testing

## Known Limitations

- `comments` has no `updated_at` column (the brief's schema has none), so an edited comment does
  not record when it was edited.
