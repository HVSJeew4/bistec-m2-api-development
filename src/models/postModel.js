const pool = require('../db/pool');
const { buildSet } = require('../utils/sql');

// Every post is returned with its author embedded, so clients need no second request.
// `p` is either the posts table or a CTE holding freshly inserted/updated rows.
const POST_FIELDS = `
  p.id, p.title, p.content, p.published,
  p.created_at AS "createdAt", p.updated_at AS "updatedAt",
  json_build_object('id', u.id, 'name', u.name) AS author`;

// Escapes LIKE wildcards so a search for "100%" matches literally.
function likePattern(text) {
  return `%${text.replace(/[\\%_]/g, '\\$&')}%`;
}

// Lists posts with filters and pagination. Returns { rows, total }.
// drafts=true lists only the viewer's own drafts; otherwise only published posts are listed.
async function list({ authorId, search, drafts = false, viewerId, sort = 'desc', limit, offset }) {
  const conditions = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    conditions.push(sql.replace('?', `$${params.length}`));
  };

  if (drafts) {
    conditions.push('p.published = false');
    add('p.author_id = ?', viewerId);
  } else {
    conditions.push('p.published = true');
  }
  if (authorId) add('p.author_id = ?', authorId);
  if (search) add(`p.title ILIKE ? ESCAPE '\\'`, likePattern(search));

  const where = `WHERE ${conditions.join(' AND ')}`;
  // `sort` is checked against ['asc', 'desc'] by the validator; it is the only value
  // placed into SQL text, because ORDER BY direction cannot be a $n parameter.
  const direction = sort === 'asc' ? 'ASC' : 'DESC';

  const [{ rows }, count] = await Promise.all([
    pool.query(
      `SELECT ${POST_FIELDS} FROM posts p JOIN users u ON u.id = p.author_id ${where}
       ORDER BY p.created_at ${direction}, p.id ${direction}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    pool.query(`SELECT count(*)::int AS total FROM posts p ${where}`, params),
  ]);
  return { rows, total: count.rows[0].total };
}

// A post the viewer may see: any published post, or the viewer's own draft.
// Someone else's draft looks exactly like a missing post (null → 404).
async function findVisible(id, viewerId = null) {
  const { rows } = await pool.query(
    `SELECT ${POST_FIELDS} FROM posts p JOIN users u ON u.id = p.author_id
     WHERE p.id = $1 AND (p.published OR p.author_id = $2)`,
    [id, viewerId],
  );
  return rows[0] || null;
}

async function create({ title, content, published = false, authorId }) {
  const { rows } = await pool.query(
    `WITH p AS (
       INSERT INTO posts (title, content, published, author_id) VALUES ($1, $2, $3, $4)
       RETURNING *
     )
     SELECT ${POST_FIELDS} FROM p JOIN users u ON u.id = p.author_id`,
    [title, content, published, authorId],
  );
  return rows[0];
}

async function update(id, fields) {
  const { clause, values } = buildSet(
    fields,
    { title: 'title', content: 'content', published: 'published' },
    2,
  );
  const { rows } = await pool.query(
    `WITH p AS (UPDATE posts SET ${clause} WHERE id = $1 RETURNING *)
     SELECT ${POST_FIELDS} FROM p JOIN users u ON u.id = p.author_id`,
    [id, ...values],
  );
  return rows[0] || null;
}

async function remove(id) {
  await pool.query('DELETE FROM posts WHERE id = $1', [id]);
}

module.exports = { list, findVisible, create, update, remove };
