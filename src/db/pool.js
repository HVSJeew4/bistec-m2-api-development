const { Pool } = require('pg');
const { databaseUrl } = require('../config');

// One pool for the whole process; node-postgres hands out and reuses connections from it.
const pool = new Pool({ connectionString: databaseUrl });

module.exports = pool;
