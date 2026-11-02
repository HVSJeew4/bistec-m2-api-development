// Runs once before all test files, in its own process context, so it opens and closes its own pool.
module.exports = async () => {
  process.env.NODE_ENV = 'test';
  const pool = require('../src/db/pool');
  const { resetDb } = require('../scripts/reset-db');
  try {
    await resetDb(pool);
  } finally {
    await pool.end();
  }
};
