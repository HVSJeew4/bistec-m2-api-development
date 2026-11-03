const pool = require('../db/pool');

// `c` is either the comments table or a CTE holding freshly inserted/updated rows.
const COMMENT_FIELDS = `
  c.id, c.content, c.post_id AS "postId", c.created_at AS "createdAt",
  json_build_object('id', u.id, 'name', u.name) AS author`;

// Comments of one post, oldest first (reading order). Returns { rows, total }.
async function listByPost(postId, { limit, offset }) {
  const [{ rows }, count] = await Promise.all([
    pool.query(
      `SELECT ${COMMENT_FIELDS} FROM comments c JOIN users u ON u.id = c.author_id
       WHERE c.post_id = $1 ORDER BY c.created_at, c.id LIMIT $2 OFFSET $3`,
      [postId, limit, offset],
    ),
    pool.query('SELECT count(*)::int AS total FROM comments WHERE post_id = $1', [postId]),
  ]);
  return { rows, total: count.rows[0].total };
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT ${COMMENT_FIELDS} FROM comments c JOIN users u ON u.id = c.author_id WHERE c.id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function create({ content, postId, authorId }) {
  const { rows } = await pool.query(
    `WITH c AS (
       INSERT INTO comments (content, post_id, author_id) VALUES ($1, $2, $3) RETURNING *
     )
     SELECT ${COMMENT_FIELDS} FROM c JOIN users u ON u.id = c.author_id`,
    [content, postId, authorId],
  );
  return rows[0];
}

async function update(id, content) {
  const { rows } = await pool.query(
    `WITH c AS (UPDATE comments SET content = $2 WHERE id = $1 RETURNING *)
     SELECT ${COMMENT_FIELDS} FROM c JOIN users u ON u.id = c.author_id`,
    [id, content],
  );
  return rows[0] || null;
}

async function remove(id) {
  await pool.query('DELETE FROM comments WHERE id = $1', [id]);
}

module.exports = { listByPost, findById, create, update, remove };
