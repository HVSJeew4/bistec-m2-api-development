const { query } = require('express-validator');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// Validators for ?page= and ?limit=, shared by every list endpoint.
const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: MAX_LIMIT })
    .withMessage(`limit must be between 1 and ${MAX_LIMIT}`)
    .toInt(),
];

// Turns validated page/limit (possibly undefined) into values for SQL LIMIT/OFFSET.
function getPagination({ page = 1, limit = DEFAULT_LIMIT } = {}) {
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = { paginationRules, getPagination, DEFAULT_LIMIT, MAX_LIMIT };
