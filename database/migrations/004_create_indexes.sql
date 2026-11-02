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
