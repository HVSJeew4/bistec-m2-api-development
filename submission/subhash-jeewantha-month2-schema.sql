-- BlogFlow API – PostgreSQL schema
-- Generated from database/migrations/ at commit 14a3a74 by scripts/package-submission.js.
-- Run against an empty database: psql -d blogflow -f <this file>
-- (In the project, `npm run db:migrate` applies the same files and tracks them.)

-- ==== 001_create_users.sql ====

-- Keeps updated_at current on every UPDATE, so application code cannot forget it.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==== 002_create_posts.sql ====

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  -- Deleting a user removes their posts (and, through comments.post_id, those posts' comments).
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER posts_set_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==== 003_create_comments.sql ====

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  -- Without ON DELETE CASCADE, DELETE /api/posts/:id would fail for any post that has comments.
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==== 004_create_indexes.sql ====

-- PostgreSQL does not index foreign keys automatically; these match the API's common queries.
-- users.email needs no extra index: its UNIQUE constraint already creates one (used by login).

-- "Posts by author" (GET /api/users/:id/posts, filter ?author_id=) and owner checks
CREATE INDEX idx_posts_author_id ON posts (author_id);

-- Default post list: published posts, newest first, paginated
CREATE INDEX idx_posts_published_created_at ON posts (published, created_at DESC);

-- Comments of one post in date order (GET /api/posts/:id/comments)
CREATE INDEX idx_comments_post_id_created_at ON comments (post_id, created_at);

-- Comments by author, and fast cascade when a user is deleted
CREATE INDEX idx_comments_author_id ON comments (author_id);
