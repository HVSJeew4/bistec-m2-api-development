const pool = require('../db/pool');
const AppError = require('../utils/AppError');
const { success } = require('../utils/response');
const { version } = require('../../package.json');

// GET /api – a starting point for anyone opening the API in a browser.
function index(_req, res) {
  success(res, {
    name: 'BlogFlow API',
    version,
    links: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      posts: '/api/posts',
      comments: '/api/comments',
    },
  });
}

async function check(_req, res) {
  try {
    await pool.query('SELECT 1');
  } catch {
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database is not reachable');
  }
  success(res, { status: 'ok', database: 'up' });
}

module.exports = { index, check };
