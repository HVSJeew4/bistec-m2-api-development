const pool = require('../../src/db/pool');

afterAll(() => pool.end());

// Runs fn inside a transaction that is always rolled back, so tests can change data freely.
async function inRollback(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    return await fn(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

describe('database schema', () => {
  it('creates the users, posts and comments tables', async () => {
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN ('users', 'posts', 'comments')`,
    );
    expect(rows.map((r) => r.table_name).sort()).toEqual(['comments', 'posts', 'users']);
  });

  it('records every migration file as applied', async () => {
    const { rows } = await pool.query('SELECT name FROM schema_migrations ORDER BY name');
    expect(rows.map((r) => r.name)).toEqual([
      '001_create_users.sql',
      '002_create_posts.sql',
      '003_create_comments.sql',
      '004_create_indexes.sql',
    ]);
  });

  it('links posts and comments to their parents with NOT NULL, cascading foreign keys', async () => {
    const { rows } = await pool.query(
      `SELECT kcu.table_name, kcu.column_name, ccu.table_name AS references_table,
              rc.delete_rule, c.is_nullable
       FROM information_schema.referential_constraints rc
       JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = rc.constraint_name
       JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = rc.constraint_name
       JOIN information_schema.columns c
         ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
       WHERE kcu.table_schema = 'public'
       ORDER BY kcu.table_name, kcu.column_name`,
    );
    expect(rows).toEqual([
      {
        table_name: 'comments',
        column_name: 'author_id',
        references_table: 'users',
        delete_rule: 'CASCADE',
        is_nullable: 'NO',
      },
      {
        table_name: 'comments',
        column_name: 'post_id',
        references_table: 'posts',
        delete_rule: 'CASCADE',
        is_nullable: 'NO',
      },
      {
        table_name: 'posts',
        column_name: 'author_id',
        references_table: 'users',
        delete_rule: 'CASCADE',
        is_nullable: 'NO',
      },
    ]);
  });

  it('rejects a second user with the same email', async () => {
    await inRollback(async (client) => {
      await expect(
        client.query(
          `INSERT INTO users (email, password_hash, name) VALUES ('amara@blogflow.test', 'x', 'Copy')`,
        ),
      ).rejects.toMatchObject({ code: '23505' }); // unique_violation
    });
  });

  it('creates the indexes used by common queries', async () => {
    const { rows } = await pool.query(
      `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%'`,
    );
    const defs = Object.fromEntries(rows.map((r) => [r.indexname, r.indexdef]));

    expect(defs.idx_posts_author_id).toContain('(author_id)');
    expect(defs.idx_posts_published_created_at).toContain('(published, created_at DESC)');
    expect(defs.idx_comments_post_id_created_at).toContain('(post_id, created_at)');
    expect(defs.idx_comments_author_id).toContain('(author_id)');
  });

  it('deletes a post’s comments when the post is deleted', async () => {
    await inRollback(async (client) => {
      const before = await client.query(
        'SELECT count(*)::int AS n FROM comments WHERE post_id = 1',
      );
      expect(before.rows[0].n).toBeGreaterThan(0);

      await client.query('DELETE FROM posts WHERE id = 1');

      const after = await client.query('SELECT count(*)::int AS n FROM comments WHERE post_id = 1');
      expect(after.rows[0].n).toBe(0);
    });
  });

  it('updates updated_at automatically when a row changes', async () => {
    await inRollback(async (client) => {
      const { rows } = await client.query(
        `UPDATE posts SET title = 'Changed' WHERE id = 1 RETURNING created_at, updated_at`,
      );
      expect(rows[0].updated_at.getTime()).toBeGreaterThan(rows[0].created_at.getTime());
    });
  });
});

describe('seed data', () => {
  it('loads 5 users, 20 posts and 50 comments', async () => {
    const { rows } = await pool.query(
      `SELECT (SELECT count(*) FROM users)::int    AS users,
              (SELECT count(*) FROM posts)::int    AS posts,
              (SELECT count(*) FROM comments)::int AS comments`,
    );
    expect(rows[0]).toEqual({ users: 5, posts: 20, comments: 50 });
  });

  it('includes both published posts and drafts', async () => {
    const { rows } = await pool.query(
      'SELECT published, count(*)::int AS n FROM posts GROUP BY published ORDER BY published',
    );
    expect(rows).toEqual([
      { published: false, n: 5 },
      { published: true, n: 15 },
    ]);
  });

  it('only puts comments on published posts', async () => {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM comments c JOIN posts p ON p.id = c.post_id WHERE NOT p.published`,
    );
    expect(rows[0].n).toBe(0);
  });

  it('stores bcrypt hashes with 10 rounds, never plain passwords', async () => {
    const { rows } = await pool.query('SELECT password_hash FROM users');
    for (const { password_hash: hash } of rows) {
      expect(hash).toMatch(/^\$2b\$10\$.{53}$/);
      expect(hash).not.toBe(process.env.SEED_USER_PASSWORD);
    }
  });
});
