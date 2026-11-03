const pool = require('../db/pool');
const AppError = require('../utils/AppError');
const { buildSet } = require('../utils/sql');

// What a user may see about themselves. password_hash is never selected here.
const OWN_COLUMNS = `id, email, name, bio, created_at AS "createdAt", updated_at AS "updatedAt"`;
// What anyone may see about an author (no email).
const PUBLIC_COLUMNS = `id, name, bio, created_at AS "createdAt"`;

const UNIQUE_VIOLATION = '23505';

async function findById(id) {
  const { rows } = await pool.query(`SELECT ${OWN_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function findPublicById(id) {
  const { rows } = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

// Only for login: the one place that reads the password hash.
async function findByEmailWithPassword(email) {
  const { rows } = await pool.query(
    `SELECT ${OWN_COLUMNS}, password_hash AS "passwordHash" FROM users WHERE email = $1`,
    [email],
  );
  return rows[0] || null;
}

async function create({ email, passwordHash, name, bio }) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name, bio) VALUES ($1, $2, $3, $4)
       RETURNING ${OWN_COLUMNS}`,
      [email, passwordHash, name, bio ?? null],
    );
    return rows[0];
  } catch (err) {
    // Relying on the UNIQUE constraint (not a SELECT first) is also safe when two
    // registrations with the same email arrive at the same time.
    if (err.code === UNIQUE_VIOLATION) throw AppError.conflict('Email is already registered');
    throw err;
  }
}

async function update(id, fields) {
  const { clause, values } = buildSet(fields, { name: 'name', bio: 'bio' }, 2);
  const { rows } = await pool.query(
    `UPDATE users SET ${clause} WHERE id = $1 RETURNING ${OWN_COLUMNS}`,
    [id, ...values],
  );
  return rows[0] || null;
}

module.exports = { findById, findPublicById, findByEmailWithPassword, create, update };
