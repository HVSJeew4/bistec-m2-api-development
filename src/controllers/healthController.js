const pool = require('../db/pool');
const AppError = require('../utils/AppError');
const { success } = require('../utils/response');

async function check(_req, res) {
  try {
    await pool.query('SELECT 1');
  } catch {
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database is not reachable');
  }
  success(res, { status: 'ok', database: 'up' });
}

module.exports = { check };
