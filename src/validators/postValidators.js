const { body, query } = require('express-validator');
const { idParam, atLeastOne, text, MAX_INT } = require('./common');
const { paginationRules } = require('../utils/pagination');

const TITLE_MAX = 255; // matches posts.title VARCHAR(255)
const CONTENT_MAX = 50000;

// Must be a real JSON boolean; "true" as a string or 1 is rejected rather than guessed at.
const published = () =>
  body('published')
    .optional()
    .custom((value) => typeof value === 'boolean')
    .withMessage('published must be true or false');

const list = [
  ...paginationRules,
  query('author_id')
    .optional()
    .isInt({ min: 1, max: MAX_INT })
    .withMessage('author_id must be a positive integer')
    .toInt(),
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('search must be 1 to 100 characters'),
  query('sort').optional().isIn(['asc', 'desc']).withMessage('sort must be "asc" or "desc"'),
  query('published')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('published must be "true" or "false"')
    .customSanitizer((value) => value === 'true'),
];

const getById = [idParam()];

const create = [text('title', TITLE_MAX), text('content', CONTENT_MAX), published()];

const update = [
  idParam(),
  atLeastOne(['title', 'content', 'published']),
  text('title', TITLE_MAX, { optional: true }),
  text('content', CONTENT_MAX, { optional: true }),
  published(),
];

const remove = [idParam()];

module.exports = { list, getById, create, update, remove };
