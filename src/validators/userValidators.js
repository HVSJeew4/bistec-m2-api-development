const { body } = require('express-validator');
const { idParam, atLeastOne, text } = require('./common');
const { paginationRules } = require('../utils/pagination');

const updateMe = [
  atLeastOne(['name', 'bio']),
  text('name', 100, { optional: true }),
  // bio may be sent as null or "" to clear it.
  body('bio')
    .optional()
    .custom((value) => value === null || typeof value === 'string')
    .withMessage('bio must be a string or null')
    .bail()
    .customSanitizer((value) => (value === null ? null : value.trim() || null))
    .custom((value) => value === null || value.length <= 2000)
    .withMessage('bio must be at most 2000 characters'),
];

const getById = [idParam()];

const listPosts = [idParam(), ...paginationRules];

module.exports = { updateMe, getById, listPosts };
