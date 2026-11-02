const { migrate } = require('./migrate');
const { seed } = require('../database/seeds/seed');

// Drops only the objects our migrations create, then rebuilds them and loads the seed data.
async function resetDb(pool) {
  await pool.query(`
    DROP TABLE IF EXISTS comments, posts, users, schema_migrations CASCADE;
    DROP FUNCTION IF EXISTS set_updated_at();
  `);
  await migrate(pool);
  return seed(pool);
}

module.exports = { resetDb };

if (require.main === module) {
  const pool = require('../src/db/pool');
  resetDb(pool)
    .then((counts) => console.log('Database reset and seeded:', counts))
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
